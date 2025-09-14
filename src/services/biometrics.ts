import { supabase } from '../config/supabase';
import { Biometrics } from '../types/database';

class BiometricsService {
  async getBiometricsByPatientId(patientId: string): Promise<Biometrics[]> {
    const { data, error } = await supabase
      .from('biometrics')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch biometrics: ${error.message}`);
    }

    return data || [];
  }

  async getBiometricsForTimepoint(patientId: string, timepoint: string): Promise<Biometrics | null> {
    const { data, error } = await supabase
      .from('biometrics')
      .select('*')
      .eq('patient_id', patientId)
      .eq('timepoint', timepoint)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch biometrics for timepoint: ${error.message}`);
    }

    return data;
  }

  async createBiometrics(biometrics: Omit<Biometrics, 'id' | 'created_at' | 'updated_at'>): Promise<Biometrics> {
    const { data, error } = await supabase
      .from('biometrics')
      .insert(biometrics)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create biometrics: ${error.message}`);
    }

    return data;
  }

  async updateBiometrics(id: string, updates: Partial<Biometrics>): Promise<Biometrics> {
    const { data, error } = await supabase
      .from('biometrics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update biometrics: ${error.message}`);
    }

    return data;
  }

  async deleteBiometrics(id: string): Promise<void> {
    const { error } = await supabase
      .from('biometrics')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete biometrics: ${error.message}`);
    }
  }

  getMetricCategories() {
    return {
      cardiopulmonary: {
        title: 'Cardiopulmonary',
        metrics: {
          six_minute_walk_distance: { label: '6MWD', unit: 'm', color: '#3B82F6' },
          fev1_percent: { label: 'FEV1', unit: '%', color: '#6366F1' }
        }
      },
      neurologic: {
        title: 'Neurologic / Functional',
        metrics: {
          gait_speed: { label: 'Gait Speed', unit: 'm/s', color: '#10B981' },
          grip_strength: { label: 'Grip Strength', unit: 'kg', color: '#34D399' }
        }
      },
      metabolic: {
        title: 'Metabolic / Inflammatory',
        metrics: {
          ldl_c: { label: 'LDL-C', unit: 'mg/dL', color: '#F59E0B' },
          alt: { label: 'ALT', unit: 'U/L', color: '#F97316' }
        }
      },
      patientReported: {
        title: 'Patient-Reported',
        metrics: {
          quality_of_life: { label: 'QoL', unit: '', color: '#EC4899' },
          fatigue_score: { label: 'Fatigue', unit: '', color: '#EF4444' }
        }
      }
    };
  }

  getTimepointLabels() {
    return {
      'baseline': 'Baseline',
      '3m': '3 months',
      '6m': '6 months',
      '12m': '12 months'
    };
  }

  formatMetricValue(metricKey: string, value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';

    const categories = this.getMetricCategories();

    for (const category of Object.values(categories)) {
      if (metricKey in category.metrics) {
        const metric = category.metrics[metricKey as keyof typeof category.metrics];
        if (metricKey === 'quality_of_life') {
          return `${Math.round(value)}`;
        }
        if (metricKey === 'gait_speed') {
          return value.toFixed(2);
        }
        return value.toFixed(1);
      }
    }

    return value.toString();
  }
}

export default new BiometricsService();