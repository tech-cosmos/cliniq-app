import { Biometrics } from '../types/database';
import ResearchAgentService from './researchAgent';

interface AnalysisResult {
  metric: string;
  label: string;
  unit: string;
  baseline?: number;
  latest?: number;
  percentChange?: number;
  absoluteChange?: number;
  thresholdBreach?: {
    type: 'high_risk' | 'moderate_risk' | 'frailty' | 'normal';
    message: string;
    clinical_significance: string;
  };
  trajectoryAlert?: {
    type: 'concerning_decline' | 'concerning_increase' | 'stable' | 'improving';
    message: string;
    clinical_significance: string;
  };
  referralRecommendation?: string;
}

interface BiometricsReport {
  patientId: string;
  generatedDate: string;
  summary: {
    totalMetrics: number;
    metricsWithData: number;
    thresholdBreaches: number;
    trajectoryAlerts: number;
  };
  analyses: AnalysisResult[];
  crossDomainCorrelations: string[];
  referralRecommendations: string[];
  references: string[];
}

class BiometricsAnalysisService {
  async generatePhysicianReport(patientId: string, biometricsData: Biometrics[]): Promise<BiometricsReport> {
    // Get patient-specific research-backed thresholds
    const researchData = await ResearchAgentService.conductPatientSpecificResearch(patientId, biometricsData);

    // Sort data by timepoint
    const sortedData = this.sortDataByTimepoint(biometricsData);
    const baseline = sortedData.find(d => d.timepoint === 'baseline');
    const latest = this.getLatestTimepoint(sortedData);

    // Analyze each metric
    const analyses: AnalysisResult[] = [];

    // Define metrics to analyze
    const metrics = [
      { key: 'six_minute_walk_distance', label: '6-Minute Walk Distance', unit: 'm' },
      { key: 'fev1_percent', label: 'FEV1', unit: '%' },
      { key: 'gait_speed', label: 'Gait Speed', unit: 'm/s' },
      { key: 'grip_strength', label: 'Grip Strength', unit: 'kg' },
      { key: 'ldl_c', label: 'LDL-C', unit: 'mg/dL' },
      { key: 'alt', label: 'ALT', unit: 'U/L' },
      { key: 'quality_of_life', label: 'Quality of Life', unit: '' },
      { key: 'fatigue_score', label: 'Fatigue Score', unit: '' }
    ];

    for (const metric of metrics) {
      const analysis = this.analyzeMetric(
        metric.key,
        metric.label,
        metric.unit,
        researchData.thresholds,
        researchData.trajectoryRules,
        baseline,
        latest
      );
      if (analysis) {
        analyses.push(analysis);
      }
    }

    // Generate cross-domain correlations
    const correlations = this.generateCorrelations(analyses);

    // Generate referral recommendations
    const referrals = this.generateReferralRecommendations(analyses);

    // Count alerts and breaches
    const thresholdBreaches = analyses.filter(a => a.thresholdBreach &&
      ['high_risk', 'moderate_risk', 'frailty'].includes(a.thresholdBreach.type)).length;
    const trajectoryAlerts = analyses.filter(a => a.trajectoryAlert &&
      ['concerning_decline', 'concerning_increase'].includes(a.trajectoryAlert.type)).length;

    return {
      patientId,
      generatedDate: new Date().toISOString(),
      summary: {
        totalMetrics: metrics.length,
        metricsWithData: analyses.length,
        thresholdBreaches,
        trajectoryAlerts
      },
      analyses,
      crossDomainCorrelations: correlations,
      referralRecommendations: referrals,
      references: researchData.references
    };
  }

  private sortDataByTimepoint(data: Biometrics[]): Biometrics[] {
    const order = ['baseline', '3m', '6m', '12m'];
    return data.sort((a, b) => order.indexOf(a.timepoint) - order.indexOf(b.timepoint));
  }

  private getLatestTimepoint(sortedData: Biometrics[]): Biometrics | undefined {
    // Get the most recent timepoint with data
    for (let i = sortedData.length - 1; i >= 0; i--) {
      if (sortedData[i]) return sortedData[i];
    }
    return undefined;
  }

  private analyzeMetric(
    metricKey: string,
    label: string,
    unit: string,
    thresholds: any[],
    trajectoryRules: any[],
    baseline?: Biometrics,
    latest?: Biometrics
  ): AnalysisResult | null {
    const baselineValue = baseline ? this.getNumericValue(baseline[metricKey as keyof Biometrics]) : undefined;
    const latestValue = latest ? this.getNumericValue(latest[metricKey as keyof Biometrics]) : undefined;

    if (baselineValue === undefined && latestValue === undefined) {
      return null;
    }

    const result: AnalysisResult = {
      metric: metricKey,
      label,
      unit,
      baseline: baselineValue,
      latest: latestValue
    };

    // Calculate changes if both values exist
    if (baselineValue !== undefined && latestValue !== undefined) {
      result.absoluteChange = latestValue - baselineValue;
      result.percentChange = ((latestValue - baselineValue) / baselineValue) * 100;
    }

    // Check thresholds
    const threshold = thresholds.find(t => t.metric === metricKey);
    if (threshold && latestValue !== undefined) {
      result.thresholdBreach = this.checkThresholdBreach(latestValue, threshold);
    }

    // Check trajectory
    const trajectoryRule = trajectoryRules.find(r => r.metric === metricKey);
    if (trajectoryRule && result.absoluteChange !== undefined) {
      result.trajectoryAlert = this.checkTrajectoryAlert(result.absoluteChange, result.percentChange, trajectoryRule, threshold);
    }

    return result;
  }

  private getNumericValue(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(numValue) ? undefined : numValue;
  }

  private checkThresholdBreach(value: number, threshold: any): any {
    if (threshold.direction === 'lower_worse') {
      if (threshold.frailtyThreshold && value < threshold.frailtyThreshold) {
        return {
          type: 'frailty',
          message: 'Frailty threshold reached',
          clinical_significance: this.getfrailtyMessage(threshold.metric)
        };
      }
      if (threshold.highRisk && value < threshold.highRisk) {
        return {
          type: 'high_risk',
          message: 'High-risk threshold reached',
          clinical_significance: this.getHighRiskMessage(threshold.metric, 'low')
        };
      }
      if (threshold.moderateRisk && value < threshold.moderateRisk) {
        return {
          type: 'moderate_risk',
          message: 'Moderate-risk threshold reached',
          clinical_significance: this.getModerateRiskMessage(threshold.metric, 'low')
        };
      }
    } else {
      if (threshold.highRisk && value > threshold.highRisk) {
        return {
          type: 'high_risk',
          message: 'Entered high-risk category',
          clinical_significance: this.getHighRiskMessage(threshold.metric, 'high')
        };
      }
      if (threshold.moderateRisk && value > threshold.moderateRisk) {
        return {
          type: 'moderate_risk',
          message: 'Entered moderate-risk category',
          clinical_significance: this.getModerateRiskMessage(threshold.metric, 'high')
        };
      }
    }
    return undefined;
  }

  private checkTrajectoryAlert(absoluteChange: number, percentChange: number | undefined, rule: any, threshold: any): any {
    if (rule.meaningfulDrop && Math.abs(absoluteChange) >= rule.meaningfulDrop && absoluteChange < 0) {
      return {
        type: 'concerning_decline',
        message: 'Clinically meaningful decline',
        clinical_significance: this.getTrajectoryMessage(rule.metric, 'decline')
      };
    }
    if (rule.meaningfulRise && Math.abs(absoluteChange) >= rule.meaningfulRise && absoluteChange > 0) {
      return {
        type: 'concerning_increase',
        message: 'Clinically meaningful increase',
        clinical_significance: this.getTrajectoryMessage(rule.metric, 'increase')
      };
    }
    return undefined;
  }

  private getfrailtyMessage(metric: string): string {
    switch (metric) {
      case 'gait_speed':
        return 'Suggests increased fall risk and functional decline. Consider comprehensive geriatric assessment.';
      default:
        return 'Requires clinical attention and potential intervention.';
    }
  }

  private getHighRiskMessage(metric: string, direction: 'high' | 'low'): string {
    switch (metric) {
      case 'six_minute_walk_distance':
        return 'Associated with increased hospitalization risk and mortality. Consider pulmonary rehabilitation.';
      case 'fev1_percent':
        return 'Indicates moderate-to-severe airflow limitation. Consider specialist referral.';
      case 'ldl_c':
        return 'Significantly elevated cardiovascular risk. Intensive statin therapy indicated.';
      case 'alt':
        return 'Suggests hepatocellular injury. Evaluate for underlying liver disease.';
      default:
        return 'Requires immediate clinical attention and intervention.';
    }
  }

  private getModerateRiskMessage(metric: string, direction: 'high' | 'low'): string {
    switch (metric) {
      case 'six_minute_walk_distance':
        return 'Below normal range. Monitor closely and consider exercise intervention.';
      case 'fev1_percent':
        return 'Mild-to-moderate airflow limitation. Optimize bronchodilator therapy.';
      case 'ldl_c':
        return 'Above target range. Consider lifestyle modification and statin therapy.';
      default:
        return 'Monitor closely and consider intervention if trend continues.';
    }
  }

  private getTrajectoryMessage(metric: string, direction: 'decline' | 'increase'): string {
    switch (metric) {
      case 'six_minute_walk_distance':
        return 'Significant functional decline. Evaluate for underlying causes and consider rehabilitation.';
      case 'fev1_percent':
        return 'Accelerated lung function decline. Reassess treatment plan and compliance.';
      case 'grip_strength':
        return 'Muscle strength decline associated with increased mortality risk.';
      case 'quality_of_life':
        return 'Meaningful deterioration in patient-reported outcomes. Consider comprehensive assessment.';
      case 'fatigue_score':
        return 'Clinically significant increase in fatigue. Evaluate for treatable causes.';
      case 'alt':
        return 'Rising liver enzymes suggest progressive hepatocellular injury.';
      default:
        return 'Clinically significant change requiring evaluation.';
    }
  }

  private generateCorrelations(analyses: AnalysisResult[]): string[] {
    const correlations: string[] = [];

    // Frailty syndrome correlation
    const gaitSpeed = analyses.find(a => a.metric === 'gait_speed');
    const fatigue = analyses.find(a => a.metric === 'fatigue_score');
    const gripStrength = analyses.find(a => a.metric === 'grip_strength');

    if (gaitSpeed?.thresholdBreach?.type === 'frailty' &&
        fatigue?.trajectoryAlert?.type === 'concerning_increase') {
      correlations.push('Concurrent gait speed decline and increased fatigue suggest frailty syndrome progression');
    }

    // Cardiopulmonary correlation
    const sixMWD = analyses.find(a => a.metric === 'six_minute_walk_distance');
    const fev1 = analyses.find(a => a.metric === 'fev1_percent');

    if (sixMWD?.trajectoryAlert?.type === 'concerning_decline' &&
        fev1?.trajectoryAlert?.type === 'concerning_decline') {
      correlations.push('Parallel decline in exercise capacity and lung function indicates cardiopulmonary deterioration');
    }

    return correlations;
  }

  private generateReferralRecommendations(analyses: AnalysisResult[]): string[] {
    const referrals: string[] = [];

    analyses.forEach(analysis => {
      switch (analysis.metric) {
        case 'fev1_percent':
          if (analysis.thresholdBreach?.type === 'high_risk' || analysis.thresholdBreach?.type === 'moderate_risk') {
            referrals.push('Pulmonology consultation for airway management and optimization');
          }
          break;
        case 'alt':
          if (analysis.trajectoryAlert?.type === 'concerning_increase' || analysis.thresholdBreach?.type === 'high_risk') {
            referrals.push('Hepatology referral for evaluation of liver enzyme elevation');
          }
          break;
        case 'gait_speed':
          if (analysis.thresholdBreach?.type === 'frailty') {
            referrals.push('Physical therapy and falls prevention clinic for mobility assessment');
          }
          break;
        case 'ldl_c':
          if (analysis.thresholdBreach?.type === 'high_risk') {
            referrals.push('Cardiology consultation for cardiovascular risk stratification');
          }
          break;
      }
    });

    return referrals;
  }
}

export default new BiometricsAnalysisService();