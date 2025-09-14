import { supabase } from '../config/supabase';
import { SOAPNote, VoiceSession } from '../types/database';
import DeepgramService from './deepgram';
import GeminiService from './gemini';

export class SOAPService {
  async createSOAPNote(soapData: Omit<SOAPNote, 'id' | 'created_at' | 'updated_at'>): Promise<SOAPNote> {
    const { data, error } = await supabase
      .from('soap_notes')
      .insert(soapData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSOAPNote(id: string, updates: Partial<SOAPNote>): Promise<SOAPNote> {
    const { data, error } = await supabase
      .from('soap_notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSOAPNote(id: string): Promise<SOAPNote | null> {
    const { data, error } = await supabase
      .from('soap_notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async deleteSOAPNote(id: string): Promise<void> {
    const { error } = await supabase
      .from('soap_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async publishSOAPNote(id: string): Promise<SOAPNote> {
    const { data, error } = await supabase
      .from('soap_notes')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async startVoiceSession(soapNoteId: string): Promise<VoiceSession> {
    const { data, error } = await supabase
      .from('voice_sessions')
      .insert({
        soap_note_id: soapNoteId,
        status: 'recording',
        transcript: '',
        audio_duration: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateVoiceSession(id: string, updates: Partial<VoiceSession>): Promise<VoiceSession> {
    const { data, error } = await supabase
      .from('voice_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async processVoiceToSOAP(
    soapNoteId: string,
    onTranscriptUpdate: (transcript: string) => void,
    onError: (error: any) => void
  ): Promise<() => Promise<void>> {
    let voiceSession: VoiceSession | null = null;
    let fullTranscript = '';

    try {
      voiceSession = await this.startVoiceSession(soapNoteId);

      await DeepgramService.startVoiceSession(
        async (newText: string) => {
          fullTranscript += ' ' + newText;
          onTranscriptUpdate(fullTranscript.trim());
          
          if (voiceSession) {
            await this.updateVoiceSession(voiceSession.id, {
              transcript: fullTranscript.trim(),
              status: 'processing'
            });
          }
        },
        onError
      );

      return async () => {
        console.log('Stop recording function called');
        if (voiceSession) {
          console.log('Stopping Deepgram session...');
          const audioBlob = DeepgramService.stopVoiceSession();
          console.log('Deepgram session stopped, audioBlob:', audioBlob);
          
          await this.updateVoiceSession(voiceSession.id, {
            status: 'completed',
            transcript: fullTranscript.trim(),
            audio_duration: audioBlob ? Math.round(audioBlob.size / 1000) : 0
          });
          console.log('Voice session updated');

          await this.updateSOAPNote(soapNoteId, {
            voice_transcript: fullTranscript.trim()
          });
          console.log('SOAP note updated');
        } else {
          console.log('No voice session to stop');
        }
      };
    } catch (error) {
      if (voiceSession) {
        await this.updateVoiceSession(voiceSession.id, {
          status: 'error'
        });
      }
      throw error;
    }
  }

  async generateSOAPFromTranscript(soapNoteId: string, patientHistory?: string): Promise<SOAPNote> {
    const soapNote = await this.getSOAPNote(soapNoteId);
    if (!soapNote || !soapNote.voice_transcript) {
      throw new Error('No transcript found for SOAP note');
    }

    try {
      const aiGenerated = await GeminiService.generateSOAPNoteFromTranscript(
        soapNote.voice_transcript,
        patientHistory
      );

      const updatedNote = await this.updateSOAPNote(soapNoteId, {
        subjective: aiGenerated.subjective,
        objective: aiGenerated.objective,
        assessment: aiGenerated.assessment,
        plan: aiGenerated.plan,
        ai_generated_content: true,
        ai_diagnostic_suggestions: aiGenerated.diagnosticSuggestions,
        status: 'draft'
      });

      return updatedNote;
    } catch (error) {
      console.error('Failed to generate SOAP from transcript:', error);
      throw error;
    }
  }

  async getVoiceSessions(soapNoteId: string): Promise<VoiceSession[]> {
    const { data, error } = await supabase
      .from('voice_sessions')
      .select('*')
      .eq('soap_note_id', soapNoteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

const soapServiceInstance = new SOAPService();
export default soapServiceInstance;