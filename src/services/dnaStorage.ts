import { supabase } from '../config/supabase';
import { StoredDNAAnalysis } from '../types/database';
import { DNAAnalysisResults } from './dna';

class DNAStorageService {
  async saveDNAAnalysis(
    patientId: string,
    filename: string,
    fileSize: number,
    databasesAnalyzed: string[],
    analysisResults: DNAAnalysisResults,
    analysisDuration?: number
  ): Promise<StoredDNAAnalysis> {
    const analysisData = {
      patient_id: patientId,
      filename,
      file_size: fileSize,
      databases_analyzed: databasesAnalyzed,
      total_variants_analyzed: analysisResults.total_variants_analyzed,
      databases_searched: analysisResults.databases_searched,
      risk_assessment: analysisResults.results.summary.risk_assessment,
      total_diseases_found: analysisResults.results.summary.total_diseases_found,
      total_allergies_found: analysisResults.results.summary.total_allergies_found,
      total_drug_interactions_found: analysisResults.results.summary.total_drug_interactions_found,
      diseases_variants: analysisResults.results.diseases,
      allergies_variants: analysisResults.results.allergies,
      drug_interactions_variants: analysisResults.results.drug_interactions,
      analysis_duration_seconds: analysisDuration,
      api_response: analysisResults,
      analysis_completed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('dna_analysis')
      .insert([analysisData])
      .select()
      .single();

    if (error) {
      console.error('Error saving DNA analysis:', error);
      throw new Error(`Failed to save DNA analysis: ${error.message}`);
    }

    return data;
  }

  async getPatientDNAAnalyses(patientId: string): Promise<StoredDNAAnalysis[]> {
    const { data, error } = await supabase
      .from('dna_analysis')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching DNA analyses:', error);
      throw new Error(`Failed to fetch DNA analyses: ${error.message}`);
    }

    return data || [];
  }

  async getDNAAnalysis(analysisId: string): Promise<StoredDNAAnalysis | null> {
    const { data, error } = await supabase
      .from('dna_analysis')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching DNA analysis:', error);
      throw new Error(`Failed to fetch DNA analysis: ${error.message}`);
    }

    return data;
  }

  async deleteDNAAnalysis(analysisId: string): Promise<void> {
    const { error } = await supabase
      .from('dna_analysis')
      .delete()
      .eq('id', analysisId);

    if (error) {
      console.error('Error deleting DNA analysis:', error);
      throw new Error(`Failed to delete DNA analysis: ${error.message}`);
    }
  }

  async updateDNAAnalysisNotes(analysisId: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('dna_analysis')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    if (error) {
      console.error('Error updating DNA analysis notes:', error);
      throw new Error(`Failed to update DNA analysis notes: ${error.message}`);
    }
  }

  async getAnalysisStatistics(patientId: string) {
    const analyses = await this.getPatientDNAAnalyses(patientId);
    
    if (analyses.length === 0) {
      return {
        totalAnalyses: 0,
        riskDistribution: { Low: 0, Medium: 0, High: 0 },
        totalVariantsFound: 0,
        recentAnalysis: null
      };
    }

    const riskDistribution = analyses.reduce((acc, analysis) => {
      acc[analysis.risk_assessment] = (acc[analysis.risk_assessment] || 0) + 1;
      return acc;
    }, { Low: 0, Medium: 0, High: 0 });

    const totalVariantsFound = analyses.reduce((sum, analysis) => 
      sum + analysis.total_diseases_found + analysis.total_allergies_found + analysis.total_drug_interactions_found, 0);

    return {
      totalAnalyses: analyses.length,
      riskDistribution,
      totalVariantsFound,
      recentAnalysis: analyses[0] // Most recent analysis
    };
  }
}

const dnaStorageService = new DNAStorageService();
export default dnaStorageService;