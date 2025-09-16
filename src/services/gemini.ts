import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  public model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  }

  async analyzeMedicalScan(imageData: string, scanType: string, patientContext?: string): Promise<{
    analysis: string;
    findings: string[];
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  }> {
    try {
      const prompt = `
        You are an expert radiologist AI assistant analyzing a ${scanType} medical image.
        ${patientContext ? `Patient context: ${patientContext}` : ''}
        
        SYSTEMATIC RADIOLOGICAL ANALYSIS PROTOCOL:
        
        1. IMAGE QUALITY & TECHNIQUE:
        - Assess image quality, positioning, and exposure
        - Note any technical limitations
        
        2. SYSTEMATIC REVIEW (analyze each structure):
        ${this.getScanTypeSpecificInstructions(scanType)}
        
        3. PATHOLOGICAL FINDINGS:
        - Identify ALL abnormalities present
        - Describe location, size, characteristics
        - Compare bilateral structures when applicable
        - Look for signs of trauma, infection, degeneration, or malignancy
        
        4. CLINICAL CORRELATION:
        - Assess clinical significance of findings
        - Consider differential diagnoses
        - Determine urgency level based on findings
        
        URGENCY LEVEL GUIDELINES:
        - CRITICAL: Fractures, acute hemorrhage, pneumothorax, bowel obstruction, large masses
        - HIGH: Suspicious lesions, significant joint space narrowing, moderate effusions
        - MEDIUM: Mild degenerative changes, small nodules requiring follow-up
        - LOW: Normal study, minimal age-related changes
        
        Provide detailed analysis focusing on:
        - Bone integrity and alignment
        - Joint spaces and soft tissues
        - Any signs of fracture, dislocation, or pathology
        - Comparison with normal anatomy
        
        Format your response as JSON:
        {
          "analysis": "Comprehensive systematic analysis of findings",
          "findings": ["Specific finding 1", "Specific finding 2", ...],
          "urgencyLevel": "low|medium|high|critical",
          "recommendations": ["Specific recommendation 1", "Specific recommendation 2", ...]
        }
        
        IMPORTANT: This is for educational/assistive purposes only. Always recommend consulting with a qualified radiologist for final diagnosis.
      `;

      // Determine MIME type based on image data
      const mimeType = this.determineMimeType(imageData);
      
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageData,
            mimeType: mimeType
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

  private getScanTypeSpecificInstructions(scanType: string): string {
    const instructions = {
      'xray': `
        BONE ASSESSMENT:
        - Examine cortical bone continuity for fractures
        - Assess trabecular pattern and bone density
        - Check for cortical thinning, sclerosis, or lucencies
        - Evaluate joint alignment and spacing
        
        SOFT TISSUE EVALUATION:
        - Assess soft tissue swelling or masses
        - Check for foreign bodies or calcifications
        - Evaluate muscle planes and fat pads
        
        SPECIFIC FINDINGS TO IDENTIFY:
        - Fractures (complete, incomplete, comminuted, displaced)
        - Dislocations or subluxations
        - Bone lesions (lytic, sclerotic, mixed)
        - Degenerative changes (joint space narrowing, osteophytes)
        - Signs of infection (periosteal reaction, soft tissue swelling)`,
      
      'ct': `
        SYSTEMATIC CT ANALYSIS:
        - Assess bone windows for fractures and bone lesions
        - Evaluate soft tissue windows for masses, fluid collections
        - Check vascular structures and enhancement patterns
        - Look for signs of hemorrhage, ischemia, or inflammation
        
        SPECIFIC ATTENTION TO:
        - Acute traumatic findings
        - Mass lesions and their characteristics
        - Fluid collections or abscesses
        - Vascular abnormalities
        - Signs of malignancy or metastases`,
      
      'mri': `
        MULTIPLANAR MRI ANALYSIS:
        - Assess T1, T2, FLAIR sequences systematically
        - Evaluate signal characteristics of all structures
        - Look for enhancement patterns if contrast given
        - Assess for edema, hemorrhage, or mass effect
        
        TISSUE CHARACTERIZATION:
        - Differentiate solid from cystic lesions
        - Assess for signs of infection or inflammation
        - Evaluate vascular structures
        - Look for neural compromise or cord compression`,
      
      'ultrasound': `
        ULTRASOUND EVALUATION:
        - Assess echogenicity and echotexture
        - Evaluate for fluid collections or masses
        - Check for vascular flow if Doppler available
        - Assess organ morphology and size
        
        DYNAMIC ASSESSMENT:
        - Real-time evaluation of movement
        - Assessment of compressibility
        - Evaluation of blood flow patterns`,
      
      'other': `
        GENERAL IMAGING ANALYSIS:
        - Systematic evaluation of all visible structures
        - Compare with normal anatomical landmarks
        - Identify any abnormal findings or asymmetries
        - Assess for signs of pathology or trauma`
    };

    return instructions[scanType.toLowerCase() as keyof typeof instructions] || instructions.other;
  }

  private determineMimeType(imageData: string): string {
    // Check for common image format signatures in base64
    if (imageData.startsWith('/9j/')) return 'image/jpeg';
    if (imageData.startsWith('iVBORw0KGgo')) return 'image/png';
    if (imageData.startsWith('R0lGOD')) return 'image/gif';
    if (imageData.startsWith('UklGR')) return 'image/webp';
    
    // Default to JPEG if unable to determine
    return 'image/jpeg';
  }
}

const geminiServiceInstance = new GeminiService();
export default geminiServiceInstance;