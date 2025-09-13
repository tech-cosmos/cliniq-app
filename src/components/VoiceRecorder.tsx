import React, { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import SOAPService from '../services/soap';

interface VoiceRecorderProps {
  soapNoteId: string;
  onTranscriptUpdate: (transcript: string) => void;
  onRecordingComplete: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  soapNoteId,
  onTranscriptUpdate,
  onRecordingComplete
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

  const startRecording = async () => {
    try {
      setError(null);
      setIsRecording(true);
      setTranscript('');

      const stopFunction = await SOAPService.processVoiceToSOAP(
        soapNoteId,
        (newTranscript: string) => {
          setTranscript(newTranscript);
          onTranscriptUpdate(newTranscript);
        },
        (error: any) => {
          console.error('Voice recording error:', error);
          setError('Failed to process voice input');
          setIsRecording(false);
        }
      );

      stopRecordingRef.current = stopFunction;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to start voice recording');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (stopRecordingRef.current) {
      try {
        await stopRecordingRef.current();
        setIsRecording(false);
        onRecordingComplete();
      } catch (error) {
        console.error('Failed to stop recording:', error);
        setError('Failed to stop recording');
      }
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Voice Recording</h3>
        <div className="flex items-center space-x-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Mic className="h-4 w-4" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Square className="h-4 w-4" />
              <span>Stop Recording</span>
            </button>
          )}
        </div>
      </div>

      {isRecording && (
        <div className="flex items-center space-x-3 mb-4 p-3 bg-red-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-700 font-medium">Recording in progress...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-sm text-gray-600 mb-2">Live Transcript</h4>
        {transcript ? (
          <div className="bg-white p-3 rounded border min-h-[100px] whitespace-pre-wrap">
            {transcript}
          </div>
        ) : (
          <div className="bg-white p-3 rounded border min-h-[100px] flex items-center justify-center text-gray-500">
            {isRecording 
              ? 'Listening... Start speaking to see transcript here.'
              : 'Click "Start Recording" to begin voice transcription.'
            }
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Speak clearly and at a normal pace</li>
          <li>Use medical terminology as needed - the AI understands medical context</li>
          <li>Structure your dictation in SOAP format: Subjective, Objective, Assessment, Plan</li>
          <li>The transcript will automatically populate your SOAP note fields</li>
        </ul>
      </div>
    </div>
  );
};