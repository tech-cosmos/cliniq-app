# Cliniq - AI-Powered SOAP Note Taking App

A comprehensive medical application that enables doctors to create SOAP notes using voice transcription, analyze medical scans with AI, and receive diagnostic assistance for better patient care.

## Features

### 🎤 Voice-Powered SOAP Notes
- Real-time voice transcription using Deepgram Voice Agents
- Automatic conversion of voice recordings to structured SOAP notes
- AI-generated SOAP note sections from voice input

### 🧠 AI Diagnostic Assistance
- Symptom analysis and diagnostic suggestions
- Differential diagnosis generation
- Drug interaction checking
- Medical scan correlation analysis

### 📊 Medical Scan Analysis
- Upload X-rays, MRIs, CT scans, and other medical images
- Automatic AI analysis using Gemini 2.5 Pro
- Urgency level assessment
- Clinical findings and recommendations

### 👥 Patient Management
- Comprehensive patient profiles
- Medical history tracking
- AI-generated patient summaries
- Allergy and medication management

### 📋 Smart Dashboard
- Patient search and filtering
- Quick access to SOAP notes and scans
- Real-time statistics and notifications
- Intuitive medical workflow

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, authentication, file storage)
- **Voice AI**: Deepgram Voice Agents
- **Medical AI**: Google Gemini 2.5 Pro
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Prerequisites

Before you begin, ensure you have the following accounts and API keys:

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Deepgram Account**: Sign up at [deepgram.com](https://deepgram.com)
3. **Google AI Account**: Get API key at [ai.google.dev](https://ai.google.dev)
4. **Node.js**: Version 16 or higher

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd cliniq-app
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Set up Row Level Security policies
4. Create a storage bucket named `medical-scans`

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env`:
```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_DEEPGRAM_API_KEY=your_deepgram_api_key
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Set Up Supabase Storage

In your Supabase dashboard:
1. Go to Storage
2. Create a new bucket called `medical-scans`
3. Set it to public or configure appropriate access policies

### 5. Run the Application

```bash
npm start
```

The application will open at `http://localhost:3000`

## Database Schema

The application uses the following main tables:

- **patients**: Patient information and medical history
- **soap_notes**: SOAP note records with AI assistance
- **medical_scans**: Medical imaging files and AI analysis
- **voice_sessions**: Voice recording sessions and transcripts
- **doctors**: Doctor profiles and credentials

## API Integrations

### Deepgram Voice Agents
- Real-time voice transcription
- Medical terminology recognition
- High accuracy for clinical documentation

### Google Gemini 2.5 Pro
- Medical scan analysis and interpretation
- SOAP note generation from transcripts
- Diagnostic assistance and suggestions
- Patient summary generation

### Supabase
- User authentication and authorization
- Real-time database operations
- File storage for medical scans
- Row-level security for patient data

## Key Components

### Dashboard (`src/components/Dashboard.tsx`)
- Main application interface
- Patient search and management
- Statistics and quick actions

### SOAP Note Editor (`src/components/SOAPNoteEditor.tsx`)
- Voice-enabled SOAP note creation
- AI-powered content generation
- Real-time collaboration features

### Diagnostic Assistant (`src/components/DiagnosticAssistant.tsx`)
- AI-powered diagnostic suggestions
- Drug interaction checking
- Differential diagnosis generation

### Scan Analysis (`src/components/ScanViewer.tsx`)
- Medical image viewing
- AI analysis display
- Clinical correlation tools

## Security Considerations

- All patient data is encrypted in transit and at rest
- Row-level security ensures doctors only access their patients
- API keys are stored securely in environment variables
- Medical scans are stored in secure cloud storage
- HIPAA compliance considerations built into data handling

## Development Guidelines

### Adding New Features
1. Follow the established component structure
2. Use TypeScript for type safety
3. Implement proper error handling
4. Add loading states for better UX
5. Follow medical data privacy standards

### Testing
```bash
npm test
```

### Building for Production
```bash
npm run build
```

## Medical Disclaimer

This application is designed for healthcare professionals and should be used as a diagnostic aid only. All AI-generated suggestions and analyses should be reviewed by qualified medical professionals. The application does not replace clinical judgment and should not be used as the sole basis for medical decisions.

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

## License

This project is proprietary software designed for medical use. Please ensure compliance with all applicable medical data regulations in your jurisdiction.