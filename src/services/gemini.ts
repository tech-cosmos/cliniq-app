import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  public model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  async analyzeMedicalScan(imageData: string, scanType: string, patientContext?: string): Promise<{
    analysis: string;
    findings: string[];
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  }> {
    try {
      const prompt = `
        You are an expert radiologist AI assistant analyzing a ${scanType} scan. 
        ${patientContext ? `Patient context: ${patientContext}` : ''}
        
        Please analyze this medical image and provide:
        1. A detailed analysis of what you observe
        2. Key findings (list format)
        3. Urgency level (low/medium/high/critical)
        4. Clinical recommendations
        
        Format your response as JSON with the following structure:
        {
          "analysis": "detailed analysis text",
          "findings": ["finding 1", "finding 2", ...],
          "urgencyLevel": "low|medium|high|critical",
          "recommendations": ["recommendation 1", "recommendation 2", ...]
        }
        
        IMPORTANT: This is for educational/assistive purposes only. Always recommend consulting with a qualified radiologist for final diagnosis.
      `;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageData,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Unable to parse AI response');
    } catch (error) {
      console.error('Failed to analyze medical scan:', error);
      throw error;
    }
  }

  async generateSOAPNoteFromTranscript(transcript: string, patientHistory?: string): Promise<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    diagnosticSuggestions: string[];
  }> {
    try {
      const prompt = `
        You are an expert medical AI assistant. Convert the following patient consultation transcript into a structured SOAP note.
        ${patientHistory ? `Patient history: ${patientHistory}` : ''}
        
        Transcript: "${transcript}"
        
        Please structure this into SOAP format and provide diagnostic suggestions. Format as JSON:
        {
          "subjective": "Patient's reported symptoms and concerns",
          "objective": "Observable findings and measurements",
          "assessment": "Clinical assessment and potential diagnoses",
          "plan": "Treatment plan and next steps",
          "diagnosticSuggestions": ["suggestion 1", "suggestion 2", ...]
        }
        
        IMPORTANT: This is for assistive purposes only. Always recommend consulting with qualified medical professionals.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Unable to parse AI response');
    } catch (error) {
      console.error('Failed to generate SOAP note:', error);
      throw error;
    }
  }

  async generatePatientSummary(soapNotes: any[], medicalScans: any[]): Promise<string> {
    try {
      const prompt = `
        Generate a comprehensive patient summary based on the following medical data:
        
        SOAP Notes: ${JSON.stringify(soapNotes, null, 2)}
        Medical Scans: ${JSON.stringify(medicalScans, null, 2)}
        
        Provide a concise but comprehensive summary including:
        - Current health status
        - Key findings and trends
        - Ongoing concerns
        - Treatment effectiveness
        - Recommendations for future care
        
        Keep it professional and clinical.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Failed to generate patient summary:', error);
      throw error;
    }
  }

  async provideDiagnosticSuggestions(symptoms: string, patientData: any): Promise<string[]> {
    try {
      const prompt = `
        Based on the following symptoms and patient data, provide potential diagnostic considerations:
        
        Symptoms: ${symptoms}
        Patient Data: ${JSON.stringify(patientData, null, 2)}
        
        Provide a list of potential diagnoses to consider, ranked by likelihood.
        Format as a JSON array of strings.
        
        IMPORTANT: These are suggestions for consideration only. Always recommend proper medical evaluation.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Failed to provide diagnostic suggestions:', error);
      throw error;
    }
  }
}

const geminiServiceInstance = new GeminiService();
export default geminiServiceInstance;