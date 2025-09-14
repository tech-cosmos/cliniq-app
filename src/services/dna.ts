// DNA Analysis Service for integrating with the Genetic Matching API
import dnaStorageService from './dnaStorage';

const DNA_API_BASE_URL = 'http://localhost:8000';

export interface DNAVariant {
  chromosome: string;
  position: number;
  reference_allele: string;
  alternate_allele: string;
  info: string;
  database_type: 'diseases' | 'allergies' | 'drug_interactions';
}

export interface DNAAnalysisResults {
  filename: string;
  total_variants_analyzed: number;
  databases_searched: string[];
  results: {
    diseases: DNAVariant[];
    allergies: DNAVariant[];
    drug_interactions: DNAVariant[];
    summary: {
      total_diseases_found: number;
      total_allergies_found: number;
      total_drug_interactions_found: number;
      risk_assessment: 'Low' | 'Medium' | 'High';
    };
  };
}

export interface DatabaseInfo {
  database_info: {
    diseases: {
      total_variants: number;
      sample_variants: string[];
    };
    allergies: {
      total_variants: number;
      sample_variants: string[];
    };
    drug_interactions: {
      total_variants: number;
      sample_variants: string[];
    };
  };
  total_databases: number;
}

export interface DNAAnalysisRequest {
  patientId: string;
  file: File;
  databases?: string[];
}

class DNAAnalysisService {
  private async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${DNA_API_BASE_URL}/`);
      if (response.ok) {
        const data = await response.json();
        console.log('DNA API health check response:', data);
        return data.status === 'active';
      }
      console.error('DNA API server returned non-OK response:', response.status, response.statusText);
      return false;
    } catch (error) {
      console.error('DNA API server health check failed (likely CORS issue):', error);
      // If it's a CORS or network error, let's try to proceed anyway
      // since curl shows the server is running
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Assuming server is running despite CORS/fetch error');
        return true;
      }
      return false;
    }
  }

  async getDatabaseInfo(): Promise<DatabaseInfo> {
    const response = await fetch(`${DNA_API_BASE_URL}/database-info`);
    if (!response.ok) {
      throw new Error(`Failed to get database info: ${response.statusText}`);
    }
    return response.json();
  }

  async analyzeVCFFile(request: DNAAnalysisRequest): Promise<DNAAnalysisResults> {
    // Skip health check for now due to potential CORS issues
    // const isHealthy = await this.checkServerHealth();
    // if (!isHealthy) {
    //   throw new Error('DNA Analysis server is not available. Please ensure the server is running on localhost:8000 and CORS is configured to allow requests from your React app domain.');
    // }

    // Validate file type
    if (!request.file.name.toLowerCase().endsWith('.vcf')) {
      throw new Error('Please upload a VCF file (.vcf extension required)');
    }

    const formData = new FormData();
    formData.append('file', request.file);
    
    // Default to all databases if not specified
    const databases = request.databases || ['diseases', 'allergies', 'drug_interactions'];
    formData.append('databases', databases.join(','));

    const startTime = Date.now();

    try {
      const response = await fetch(`${DNA_API_BASE_URL}/analyze-genetics`, {
        method: 'POST',
        body: formData,
        // Set a longer timeout for large files (20 minutes)
        signal: AbortSignal.timeout(20 * 60 * 1000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Analysis failed: ${response.statusText}`);
      }

      const analysisResults: DNAAnalysisResults = await response.json();
      const analysisDuration = Math.round((Date.now() - startTime) / 1000);

      // Save the analysis results to the database
      try {
        await dnaStorageService.saveDNAAnalysis(
          request.patientId,
          request.file.name,
          request.file.size,
          databases,
          analysisResults,
          analysisDuration
        );
        console.log('DNA analysis results saved successfully');
      } catch (storageError) {
        console.error('Failed to save DNA analysis results:', storageError);
        // Don't throw here - we want to return the results even if storage fails
      }

      return analysisResults;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Analysis timed out. Large files may take up to 20 minutes to process.');
        }
        throw error;
      }
      throw new Error('Failed to analyze DNA file');
    }
  }

  async analyzeVCFFromURL(dnaUrl: string, databases?: string[]): Promise<DNAAnalysisResults> {
    // Skip health check for now due to potential CORS issues
    // const isHealthy = await this.checkServerHealth();
    // if (!isHealthy) {
    //   throw new Error('DNA Analysis server is not available. Please ensure the server is running on localhost:8000');
    // }

    const requestBody = {
      dna_url: dnaUrl,
      databases: databases || ['diseases', 'allergies', 'drug_interactions']
    };

    try {
      const response = await fetch(`${DNA_API_BASE_URL}/analyze-genetics-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Set a longer timeout for URL analysis
        signal: AbortSignal.timeout(20 * 60 * 1000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Analysis failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Analysis timed out. Large files may take up to 20 minutes to process.');
        }
        throw error;
      }
      throw new Error('Failed to analyze DNA from URL');
    }
  }

  getRiskLevelColor(riskLevel: string): string {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getRiskLevelIcon(riskLevel: string): string {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return '✓';
      case 'medium':
        return '⚠️';
      case 'high':
        return '🚨';
      default:
        return '❓';
    }
  }

  formatVariantLocation(variant: DNAVariant): string {
    return `${variant.chromosome}:${variant.position}:${variant.reference_allele}→${variant.alternate_allele}`;
  }

  getDatabaseDisplayName(dbType: string): string {
    switch (dbType) {
      case 'diseases':
        return 'Genetic Diseases';
      case 'allergies':
        return 'Allergies & Intolerances';
      case 'drug_interactions':
        return 'Drug Interactions';
      default:
        return dbType;
    }
  }

  getDatabaseIcon(dbType: string): string {
    switch (dbType) {
      case 'diseases':
        return '🧬';
      case 'allergies':
        return '⚠️';
      case 'drug_interactions':
        return '💊';
      default:
        return '📊';
    }
  }
}

const dnaAnalysisService = new DNAAnalysisService();
export default dnaAnalysisService;