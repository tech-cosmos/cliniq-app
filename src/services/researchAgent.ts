interface ResearchQuery {
  query: string;
  metric: string;
  purpose: string;
}

interface ClinicalThreshold {
  metric: string;
  highRisk?: number;
  moderateRisk?: number;
  frailtyThreshold?: number;
  normalValue?: number;
  meaningfulChange?: number;
  unit: string;
  direction: 'higher_worse' | 'lower_worse';
}

interface TrajectoryRule {
  metric: string;
  meaningfulDrop?: number;
  meaningfulRise?: number;
  timeframe: string;
  unit: string;
  type: 'absolute' | 'percentage';
}

interface ResearchResult {
  thresholds: ClinicalThreshold[];
  trajectoryRules: TrajectoryRule[];
  references: string[];
  lastUpdated: string;
}

class ResearchAgentService {
  private openaiApiKey: string = process.env.REACT_APP_OPENAI_API_KEY || '';
  private researchCache: Map<string, ResearchResult> = new Map();

  private researchQueries: ResearchQuery[] = [
    {
      query: "6-minute walk test threshold hospitalization risk",
      metric: "six_minute_walk_distance",
      purpose: "Establish high-risk threshold for 6MWD"
    },
    {
      query: "Clinically meaningful drop in 6MWD",
      metric: "six_minute_walk_distance",
      purpose: "Determine significant trajectory change"
    },
    {
      query: "Normal annual decline in FEV1 aging",
      metric: "fev1_percent",
      purpose: "Establish expected vs concerning decline"
    },
    {
      query: "Frailty cutoff gait speed m/s",
      metric: "gait_speed",
      purpose: "Define frailty threshold"
    },
    {
      query: "Grip strength decline mortality risk PURE study",
      metric: "grip_strength",
      purpose: "Establish mortality risk thresholds"
    },
    {
      query: "LDL levels cardiovascular risk per 40 mg/dL",
      metric: "ldl_c",
      purpose: "Define cardiovascular risk categories"
    },
    {
      query: "ALT elevation cutoff NAFLD guidelines",
      metric: "alt",
      purpose: "Establish liver function concern thresholds"
    },
    {
      query: "SF-36 QoL MCID clinically meaningful change",
      metric: "quality_of_life",
      purpose: "Define meaningful quality of life changes"
    },
    {
      query: "Minimal clinically important difference fatigue score",
      metric: "fatigue_score",
      purpose: "Establish significant fatigue changes"
    }
  ];

  async conductPatientSpecificResearch(patientId: string, biometricsData: any[]): Promise<ResearchResult> {
    const cacheKey = `patient_research_${patientId}_${this.getDataHash(biometricsData)}`;

    if (this.researchCache.has(cacheKey)) {
      return this.researchCache.get(cacheKey)!;
    }

    try {
      const researchPrompt = this.buildPatientSpecificResearchPrompt(patientId, biometricsData);
      const response = await this.callOpenAIResearch(researchPrompt);
      const result = this.parseResearchResponse(response);

      this.researchCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Patient-specific research failed:', error);
      // Return default thresholds based on clinical knowledge
      return this.getDefaultThresholds();
    }
  }

  private buildResearchPrompt(): string {
    return `You are a clinical research agent tasked with finding evidence-based thresholds and trajectory rules for biometric monitoring.

Research these specific queries and provide clinically validated cutoffs:

${this.researchQueries.map(q => `- ${q.query} (for ${q.metric}): ${q.purpose}`).join('\n')}

For each metric, provide:
1. High-risk threshold values
2. Clinically meaningful change values (both absolute and percentage where applicable)
3. Time-based trajectory rules
4. Supporting evidence from peer-reviewed sources

Focus on established clinical guidelines, meta-analyses, and large cohort studies. Prioritize:
- PubMed indexed studies
- Clinical practice guidelines
- Validated scoring systems
- Large population studies (>1000 participants)

Format your response as structured data with specific numeric thresholds, units, and references.`;
  }

  private buildPatientSpecificResearchPrompt(patientId: string, biometricsData: any[]): string {
    const patientMetrics = this.analyzePatientMetrics(biometricsData);
    const concerningFindings = this.identifyConcerningFindings(patientMetrics);

    return `You are a clinical research agent conducting targeted research for a specific patient (ID: ${patientId}).

PATIENT BIOMETRIC DATA ANALYSIS:
${patientMetrics.summary}

CONCERNING FINDINGS IDENTIFIED:
${concerningFindings.join('\n')}

TARGETED RESEARCH QUERIES:
Based on this patient's specific data, conduct focused research on:

${this.generatePatientSpecificQueries(patientMetrics).map(q => `- ${q.query} (Priority: ${q.priority}): ${q.rationale}`).join('\n')}

For this patient's specific presentation, provide:
1. Evidence-based thresholds most relevant to their condition profile
2. Trajectory analysis rules tailored to their specific metrics showing concerning trends
3. Risk stratification specific to their demographic and clinical presentation
4. Specialized referral criteria based on their actual findings
5. Cross-domain correlations relevant to their specific metric patterns

Focus on recent clinical guidelines and studies most applicable to this patient's presentation.
Prioritize high-impact research that directly impacts clinical decision-making for this case.

Format as structured clinical recommendations with supporting evidence and specific numeric thresholds.`;
  }

  private analyzePatientMetrics(biometricsData: any[]): any {
    const baseline = biometricsData.find(d => d.timepoint === 'baseline');
    const latest = this.getLatestTimepoint(biometricsData);

    const metrics = [
      'six_minute_walk_distance', 'fev1_percent', 'gait_speed', 'grip_strength',
      'ldl_c', 'alt', 'quality_of_life', 'fatigue_score'
    ];

    const summary: string[] = [];
    const availableMetrics: string[] = [];

    metrics.forEach(metric => {
      const baselineValue = baseline ? this.getNumericValue(baseline[metric]) : undefined;
      const latestValue = latest ? this.getNumericValue(latest[metric]) : undefined;

      if (baselineValue !== undefined || latestValue !== undefined) {
        availableMetrics.push(metric);

        if (baselineValue !== undefined && latestValue !== undefined) {
          const change = latestValue - baselineValue;
          const percentChange = ((latestValue - baselineValue) / baselineValue) * 100;
          summary.push(`${metric}: ${baselineValue} → ${latestValue} (Δ${change.toFixed(1)}, ${percentChange.toFixed(1)}%)`);
        } else if (latestValue !== undefined) {
          summary.push(`${metric}: ${latestValue} (single timepoint)`);
        }
      }
    });

    return {
      summary: summary.join('\n'),
      availableMetrics,
      baseline,
      latest,
      timepoints: biometricsData.map(d => d.timepoint)
    };
  }

  private identifyConcerningFindings(patientMetrics: any): string[] {
    const findings: string[] = [];
    const defaultThresholds = this.getDefaultThresholds();

    patientMetrics.availableMetrics.forEach((metric: string) => {
      const threshold = defaultThresholds.thresholds.find(t => t.metric === metric);
      const latestValue = patientMetrics.latest ? this.getNumericValue(patientMetrics.latest[metric]) : undefined;

      if (threshold && latestValue !== undefined) {
        if (threshold.direction === 'lower_worse') {
          if (threshold.highRisk && latestValue < threshold.highRisk) {
            findings.push(`${metric}: ${latestValue} below high-risk threshold (${threshold.highRisk})`);
          }
          if (threshold.frailtyThreshold && latestValue < threshold.frailtyThreshold) {
            findings.push(`${metric}: ${latestValue} below frailty threshold (${threshold.frailtyThreshold})`);
          }
        } else if (threshold.direction === 'higher_worse') {
          if (threshold.highRisk && latestValue > threshold.highRisk) {
            findings.push(`${metric}: ${latestValue} above high-risk threshold (${threshold.highRisk})`);
          }
        }
      }
    });

    return findings;
  }

  private generatePatientSpecificQueries(patientMetrics: any): any[] {
    const queries: any[] = [];

    patientMetrics.availableMetrics.forEach((metric: string) => {
      const baseQuery = this.researchQueries.find(q => q.metric === metric);
      if (baseQuery) {
        queries.push({
          query: baseQuery.query,
          priority: this.getPriorityForMetric(metric, patientMetrics),
          rationale: this.getRationaleForMetric(metric, patientMetrics)
        });
      }
    });

    return queries.sort((a, b) => b.priority - a.priority);
  }

  private getPriorityForMetric(metric: string, patientMetrics: any): number {
    // Higher priority for metrics with concerning findings
    const findings = this.identifyConcerningFindings(patientMetrics);
    const hasConcerningFinding = findings.some(f => f.includes(metric));

    return hasConcerningFinding ? 10 : 5;
  }

  private getRationaleForMetric(metric: string, patientMetrics: any): string {
    const latestValue = patientMetrics.latest ? this.getNumericValue(patientMetrics.latest[metric]) : undefined;
    return `Patient's current ${metric} value (${latestValue}) requires targeted research for clinical decision-making`;
  }

  private getLatestTimepoint(sortedData: any[]): any | undefined {
    const order = ['baseline', '3m', '6m', '12m'];
    const sorted = sortedData.sort((a, b) => order.indexOf(a.timepoint) - order.indexOf(b.timepoint));

    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i]) return sorted[i];
    }
    return undefined;
  }

  private getNumericValue(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(numValue) ? undefined : numValue;
  }

  private getDataHash(data: any[]): string {
    return btoa(JSON.stringify(data)).slice(0, 8);
  }

  private async callOpenAIResearch(prompt: string): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a clinical research specialist with access to medical literature. Provide evidence-based clinical thresholds with proper citations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private parseResearchResponse(response: string): ResearchResult {
    // This would parse the AI response and extract structured data
    // For now, implementing with evidence-based defaults
    return this.getDefaultThresholds();
  }

  private getDefaultThresholds(): ResearchResult {
    return {
      thresholds: [
        {
          metric: 'six_minute_walk_distance',
          highRisk: 400,
          moderateRisk: 450,
          normalValue: 500,
          meaningfulChange: 50,
          unit: 'm',
          direction: 'lower_worse'
        },
        {
          metric: 'fev1_percent',
          highRisk: 50,
          moderateRisk: 70,
          normalValue: 80,
          meaningfulChange: 10,
          unit: '%',
          direction: 'lower_worse'
        },
        {
          metric: 'gait_speed',
          frailtyThreshold: 0.8,
          normalValue: 1.2,
          meaningfulChange: 0.1,
          unit: 'm/s',
          direction: 'lower_worse'
        },
        {
          metric: 'grip_strength',
          meaningfulChange: 5,
          unit: 'kg',
          direction: 'lower_worse'
        },
        {
          metric: 'ldl_c',
          highRisk: 160,
          moderateRisk: 130,
          normalValue: 100,
          meaningfulChange: 40,
          unit: 'mg/dL',
          direction: 'higher_worse'
        },
        {
          metric: 'alt',
          highRisk: 40,
          moderateRisk: 30,
          normalValue: 25,
          meaningfulChange: 30,
          unit: 'U/L',
          direction: 'higher_worse'
        },
        {
          metric: 'quality_of_life',
          meaningfulChange: 10,
          unit: 'points',
          direction: 'lower_worse'
        },
        {
          metric: 'fatigue_score',
          meaningfulChange: 1.5,
          unit: 'points',
          direction: 'higher_worse'
        }
      ],
      trajectoryRules: [
        {
          metric: 'six_minute_walk_distance',
          meaningfulDrop: 50,
          timeframe: 'any_followup',
          unit: 'm',
          type: 'absolute'
        },
        {
          metric: 'fev1_percent',
          meaningfulDrop: 10,
          timeframe: 'any_followup',
          unit: '%',
          type: 'percentage'
        },
        {
          metric: 'grip_strength',
          meaningfulDrop: 5,
          timeframe: 'any_followup',
          unit: 'kg',
          type: 'absolute'
        },
        {
          metric: 'alt',
          meaningfulRise: 30,
          timeframe: 'any_followup',
          unit: '%',
          type: 'percentage'
        },
        {
          metric: 'quality_of_life',
          meaningfulDrop: 10,
          timeframe: 'any_followup',
          unit: 'points',
          type: 'absolute'
        },
        {
          metric: 'fatigue_score',
          meaningfulRise: 1.5,
          timeframe: 'any_followup',
          unit: 'points',
          type: 'absolute'
        }
      ],
      references: [
        "Casanova C, et al. The 6-min walk distance in healthy subjects: reference standards from seven countries. Eur Respir J. 2011;37(1):150-6.",
        "Studenski S, et al. Gait speed and survival in older adults. JAMA. 2011;305(1):50-58.",
        "Leong DP, et al. Prognostic value of grip strength: findings from the Prospective Urban Rural Epidemiology (PURE) study. Lancet. 2015;386(9990):266-73.",
        "Grundy SM, et al. 2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Blood Cholesterol. Circulation. 2019;139(25):e1082-e1143.",
        "Chalasani N, et al. The diagnosis and management of nonalcoholic fatty liver disease: Practice guidance from the American Association for the Study of Liver Diseases. Hepatology. 2018;67(1):328-357.",
        "Ware JE Jr, Sherbourne CD. The MOS 36-item short-form health survey (SF-36). Med Care. 1992;30(6):473-83."
      ],
      lastUpdated: new Date().toISOString()
    };
  }
}

export default new ResearchAgentService();