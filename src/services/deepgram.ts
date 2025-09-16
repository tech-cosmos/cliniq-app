import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

class DeepgramService {
  private deepgram: any;
  private connection: any;
  private isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  constructor() {
    this.deepgram = createClient(process.env.REACT_APP_DEEPGRAM_API_KEY!);
  }

  async startVoiceSession(onTranscript: (text: string) => void, onError: (error: any) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connection = this.deepgram.listen.live({
          model: 'nova-3',
          language: 'en-US',
          smart_format: true,
          filler_words: false,
          punctuate: true,
          utterance_end_ms: 1000,
          vad_events: true,
          interim_results: true,
        });

        this.connection.on(LiveTranscriptionEvents.Open, async () => {
          console.log('Deepgram connection opened');
          try {
            await this.startAudioCapture(onTranscript, onError);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          if (transcript && data.is_final) {
            onTranscript(transcript);
          }
        });

        this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
          console.error('Deepgram error:', error);
          onError(error);
          reject(error);
        });

        this.connection.on(LiveTranscriptionEvents.Close, () => {
          console.log('Deepgram connection closed');
        });

      } catch (error) {
        console.error('Failed to start voice session:', error);
        onError(error);
        reject(error);
      }
    });
  }

  private async startAudioCapture(onTranscript: (text: string) => void, onError: (error: any) => void): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0 && this.connection?.getReadyState() === 1) {
          this.connection.send(event.data);
        }
        this.audioChunks.push(event.data);
      });

      this.mediaRecorder.addEventListener('stop', () => {
        stream.getTracks().forEach(track => track.stop());
      });

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

    } catch (error) {
      console.error('Failed to start audio capture:', error);
      onError(error);
    }
  }

  stopVoiceSession(): Blob | null {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }

    if (this.connection) {
      this.connection.finish();
    }

    if (this.audioChunks.length > 0) {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];
      return audioBlob;
    }

    return null;
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  async transcribeAudioFile(audioBlob: Blob): Promise<string> {
    try {
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBlob,
        {
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          punctuate: true,
          filler_words: false,
        }
      );

      if (error) {
        throw error;
      }

      return result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    } catch (error) {
      console.error('Failed to transcribe audio file:', error);
      throw error;
    }
  }
}

const deepgramServiceInstance = new DeepgramService();
export default deepgramServiceInstance;