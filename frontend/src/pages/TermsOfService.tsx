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

export default function TermsOfService() {
  return (
    <Box sx={{ minHeight: '100svh', bgcolor: '#0b0906', py: 6, px: 2 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Typography sx={{ fontFamily: '"Cinzel", serif', color: '#c8a44a', fontSize: '1.5rem', mb: 0.5 }}>
          Lorestone
        </Typography>
        <Typography sx={{ color: '#786c5c', fontSize: '0.8rem', mb: 1 }}>
          Terms of Service — Last updated March 2026
        </Typography>
        <Divider sx={{ borderColor: 'rgba(200,164,74,0.2)', mb: 4 }} />

        <Section title="1. Acceptance">
          <Typography>
            By creating an account or using Lorestone you agree to these Terms. If you do not agree, do not use the service.
          </Typography>
        </Section>

        <Section title="2. The service">
          <Typography>
            Lorestone is a campaign management tool for tabletop roleplaying games. It is provided as-is and may be modified, suspended, or discontinued at any time.
          </Typography>
        </Section>

        <Section title="3. Your account">
          <Typography component="div">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>You are responsible for keeping your credentials secure.</li>
              <li style={{ marginTop: 8 }}>You must be at least 13 years old to use Lorestone.</li>
              <li style={{ marginTop: 8 }}>You may not share your account with others or use the service on behalf of another person without their consent.</li>
            </ul>
          </Typography>
        </Section>

        <Section title="4. Your content">
          <Typography sx={{ mb: 1.5 }}>
            You retain ownership of all campaign content you create. By storing content in Lorestone you grant us a limited license to store, process, and display it solely to provide the service.
          </Typography>
          <Typography>
            You must not upload content that is illegal, infringes copyright, or violates the rights of others.
          </Typography>
        </Section>

        <Section title="5. Audio recording and transcription">
          <Typography sx={{ mb: 1.5 }}>
            The transcription feature records microphone audio and sends it to Deepgram for processing. <strong style={{ color: '#e6d8c0' }}>You are solely responsible for:</strong>
          </Typography>
          <Typography component="div">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>Obtaining consent from all participants before recording any session.</li>
              <li style={{ marginTop: 8 }}>Complying with all applicable recording and wiretapping laws in your jurisdiction.</li>
              <li style={{ marginTop: 8 }}>Not recording minors without parental consent.</li>
            </ul>
          </Typography>
          <Typography sx={{ mt: 1.5 }}>
            Lorestone and its operators assume no liability for unlawful recording by users.
          </Typography>
        </Section>

        <Section title="6. Prohibited use">
          <Typography component="div">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>Do not attempt to circumvent rate limits, authentication, or security measures.</li>
              <li style={{ marginTop: 8 }}>Do not use the service to store or transmit malicious code.</li>
              <li style={{ marginTop: 8 }}>Do not abuse the transcription or AI features to incur excessive third-party costs.</li>
            </ul>
          </Typography>
        </Section>

        <Section title="7. Termination">
          <Typography>
            We may suspend or terminate accounts that violate these Terms. You may delete your account at any time from your Profile settings, which permanently erases all your data.
          </Typography>
        </Section>

        <Section title="8. Disclaimer and limitation of liability">
          <Typography sx={{ mb: 1.5 }}>
            Lorestone is provided <strong style={{ color: '#e6d8c0' }}>"as is"</strong> without warranties of any kind. We do not guarantee uptime, data availability, or fitness for a particular purpose.
          </Typography>
          <Typography>
            To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the service, including loss of campaign data.
          </Typography>
        </Section>

        <Section title="9. Governing law">
          <Typography>
            These Terms are governed by the laws of the Republic of Costa Rica. Disputes shall be resolved in the competent courts of Costa Rica.
          </Typography>
        </Section>

        <Section title="10. Contact">
          <Typography>
            Questions about these Terms: <strong style={{ color: '#e6d8c0' }}>legal@lorestone.app</strong>
          </Typography>
        </Section>

      </Box>
      <PublicFooter />
    </Box>
  )
}
