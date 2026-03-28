import { Box, Typography, Divider } from '@mui/material'
import { Link } from 'react-router-dom'
import PublicFooter from '../components/PublicFooter'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography sx={{ fontFamily: '"Cinzel", serif', color: '#c8a44a', fontSize: '1rem', mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ color: '#b4a48a', fontSize: '0.875rem', lineHeight: 1.8 }}>
        {children}
      </Box>
    </Box>
  )
}

export default function PrivacyPolicy() {
  return (
    <Box sx={{ minHeight: '100svh', bgcolor: '#0b0906', py: 6, px: 2 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Typography sx={{ fontFamily: '"Cinzel", serif', color: '#c8a44a', fontSize: '1.5rem', mb: 0.5 }}>
          Lorestone
        </Typography>
        <Typography sx={{ color: '#786c5c', fontSize: '0.8rem', mb: 1 }}>
          Privacy Policy — Last updated March 2026
        </Typography>
        <Divider sx={{ borderColor: 'rgba(200,164,74,0.2)', mb: 4 }} />

        <Section title="1. Who we are">
          <Typography>
            Lorestone is a TTRPG campaign management tool operated from Costa Rica. We are subject to Costa Rica's Data Protection Law (Ley 8968) and its implementing regulations.
          </Typography>
        </Section>

        <Section title="2. Data we collect">
          <Typography component="div">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li><strong style={{ color: '#e6d8c0' }}>Account data:</strong> Email address, name, date of birth, avatar image, and optionally your Google account identifier if you sign in with Google.</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#e6d8c0' }}>Campaign content:</strong> All text, notes, characters, items, decisions, maps, and other content you create within the app.</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#e6d8c0' }}>Audio recordings and transcripts:</strong> When you use the transcription feature, audio from your microphone is streamed to Deepgram (see section 4) and the resulting transcript text is stored in your campaign.</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#e6d8c0' }}>Technical data:</strong> IP address (used for rate limiting and security), approximate timestamps of actions.</li>
            </ul>
          </Typography>
        </Section>

        <Section title="3. How we use your data">
          <Typography component="div">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>To provide, operate, and improve the Lorestone service.</li>
              <li style={{ marginTop: 8 }}>To authenticate your account and protect against unauthorized access.</li>
              <li style={{ marginTop: 8 }}>To send transactional emails (account verification, password reset). We do not send marketing emails.</li>
              <li style={{ marginTop: 8 }}>We do not sell, rent, or share your personal data with third parties for marketing purposes.</li>
            </ul>
          </Typography>
        </Section>

        <Section title="4. Third-party processors">
          <Typography sx={{ mb: 1.5 }}>
            We use the following third-party services to operate Lorestone. By using the app you acknowledge that your data may be processed by these providers under their own privacy policies:
          </Typography>
          <Typography component="div">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li><strong style={{ color: '#e6d8c0' }}>Deepgram</strong> — Speech-to-text transcription. Audio data is streamed to Deepgram's servers for processing. Deepgram's privacy policy applies to audio data during processing.</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#e6d8c0' }}>Cloudflare R2</strong> — File storage for uploaded images and maps.</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#e6d8c0' }}>Google OAuth</strong> — Optional sign-in with Google. Only your name and email address are received.</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#e6d8c0' }}>Railway / PostgreSQL</strong> — Database hosting. All campaign data resides on encrypted PostgreSQL servers.</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#e6d8c0' }}>Resend</strong> — Transactional email delivery (verification and password reset emails).</li>
            </ul>
          </Typography>
        </Section>

        <Section title="5. Audio recording and all-party consent">
          <Typography sx={{ mb: 1.5 }}>
            The transcription feature records audio from your microphone. <strong style={{ color: '#e6d8c0' }}>You are responsible for ensuring all participants at your session have consented to being recorded before starting a recording.</strong>
          </Typography>
          <Typography>
            Recording laws vary by jurisdiction. In some countries and US states, all parties must actively consent to a conversation being recorded (all-party consent). Costa Rica's personal data law requires express consent for processing personal data, including voice. Do not record anyone without their knowledge and agreement.
          </Typography>
        </Section>

        <Section title="6. Your rights (Ley 8968)">
          <Typography sx={{ mb: 1.5 }}>
            Under Costa Rica's data protection law you have the right to:
          </Typography>
          <Typography component="div">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li><strong style={{ color: '#e6d8c0' }}>Access</strong> — request confirmation that we hold your data and receive a copy.</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#e6d8c0' }}>Rectification</strong> — correct inaccurate personal data via your profile settings.</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#e6d8c0' }}>Erasure</strong> — delete your account and all associated data permanently from your Profile → Danger zone section.</li>
              <li style={{ marginTop: 8 }}><strong style={{ color: '#e6d8c0' }}>Objection</strong> — object to certain processing by contacting us.</li>
            </ul>
          </Typography>
          <Typography sx={{ mt: 1.5 }}>
            To exercise any right not available in-app, contact us at the email listed in section 9.
          </Typography>
        </Section>

        <Section title="7. Data retention">
          <Typography>
            We retain your data for as long as your account is active. When you delete your account, all personal data is permanently erased from our systems within 30 days. Backups may retain data for up to 7 additional days.
          </Typography>
        </Section>

        <Section title="8. Security">
          <Typography>
            Passwords are hashed using bcrypt. Data is stored on encrypted servers. Access tokens expire within 30 days. We apply rate limiting on authentication endpoints to prevent brute-force attacks. No system is perfectly secure — please use a strong, unique password.
          </Typography>
        </Section>

        <Section title="9. Contact">
          <Typography>
            For privacy-related requests, contact: <strong style={{ color: '#e6d8c0' }}>privacy@lorestone.app</strong>
          </Typography>
        </Section>

      </Box>
      <PublicFooter />
    </Box>
  )
}
