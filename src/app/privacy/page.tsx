import type { Metadata } from "next"
import { LegalPage } from "@/components/public/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Events Partner collects, why, who processes it, and the choices you have.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="Events Partner helps hosts plan events, send invitations and collect RSVPs. This page explains what information the service handles, why, and who helps us handle it. It covers both hosts (people with an account) and guests (people who open an invitation or RSVP link)."
    >
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address and a hashed password (we never store your password itself). If you sign in with Google, we receive your name, email address and profile picture from Google.</li>
        <li><strong>Event content you add:</strong> event details, schedules, invitation designs, photos, seating plans, website sections, music links and questions.</li>
        <li><strong>Guest information hosts enter or guests submit:</strong> names, email addresses, phone numbers, RSVP answers, plus-ones, meal and dietary preferences, notes, and check-in status. Guests do not need an account to RSVP.</li>
        <li><strong>Payment details:</strong> payments are made manually outside the site. We store the plan you chose, the payment reference and method you enter, and the proof-of-payment image you upload, so an administrator can approve it.</li>
        <li><strong>Messages:</strong> a log of emails and text messages sent through the service (recipient, content, time and delivery status).</li>
        <li><strong>Technical data:</strong> a session cookie that keeps you signed in, and your network (IP) address, which is used briefly to limit repeated sign-in, sign-up and RSVP attempts. Our hosting provider also keeps standard server logs.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the service: sign you in, show your events, collect RSVPs, seat guests, and check people in.</li>
        <li>To send messages you ask us to send, such as invitations, reminders, account verification and password-reset emails.</li>
        <li>To review payments and unlock the plan you purchased.</li>
        <li>To keep the service secure, for example rate limiting and preventing abuse.</li>
      </ul>
      <p>We do not sell personal information and we do not show advertising.</p>

      <h2>Who processes it for us</h2>
      <ul>
        <li><strong>Vercel</strong> hosts the website and its servers (in Singapore).</li>
        <li><strong>Neon</strong> hosts the database (in Singapore).</li>
        <li><strong>Resend</strong> delivers emails, and an SMS provider delivers text messages, when those are enabled for the site.</li>
        <li><strong>Google</strong> provides optional Google sign-in. If a host adds background music, the invitation page loads a YouTube player, and YouTube may set its own cookies and receive the visitor&apos;s IP address once the player is used.</li>
      </ul>

      <h2>Guests</h2>
      <p>
        If you received an invitation, the host who invited you entered your name and contact details and is responsible for how they use your responses. Your RSVP is visible to that host and to any team members they add. If you want your details removed from an event, ask the host, or contact us using the details below.
      </p>

      <h2>Cookies</h2>
      <p>
        We use one essential cookie to keep you signed in. We do not use advertising or analytics cookies. Third-party embeds, such as the YouTube music player, may set their own cookies when used.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep account and event information for as long as your account exists. Sign-in and RSVP attempt counters expire automatically within about an hour. You can ask us to delete your account and its data at any time.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to see, correct or delete the personal information we hold about you, or withdraw consent for Google sign-in by removing the app from your Google account. Hosts can edit or delete guest entries and events directly in their dashboard.
      </p>

      <h2>Security</h2>
      <p>
        Passwords are hashed, connections use HTTPS, private payment proofs are only shown to administrators and the account that uploaded them, and administrator pages require an administrator account. No online service can promise perfect security, so please use a strong, unique password.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes in a meaningful way, the date at the top of the page will be updated.</p>
    </LegalPage>
  )
}
