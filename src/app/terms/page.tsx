import type { Metadata } from "next"
import { LegalPage } from "@/components/public/legal-page"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Events Partner: accounts, content, plans and payments.",
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="By creating an account or using Events Partner you agree to these terms. If you do not agree, please do not use the service."
    >
      <h2>The service</h2>
      <p>
        Events Partner lets hosts create event pages and invitations, manage guest lists and RSVPs, plan seating, send messages, and check guests in. Features available to you depend on your plan.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You are responsible for your account and for keeping your password secure.</li>
        <li>Give accurate information, and do not use another person&apos;s account.</li>
        <li>You must be old enough to enter into a binding agreement where you live.</li>
      </ul>

      <h2>Your content and your guests</h2>
      <ul>
        <li>You own what you upload. You give us permission to store it, process it and display it as needed to run the service, including on your public invitation page.</li>
        <li>You are responsible for having the right to use the photos, music links and guest information you add, and for having your guests&apos; permission to contact them.</li>
        <li>Only send messages to people who expect to hear from you about your event.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>break the law, or upload unlawful, hateful, harassing, infringing or malicious content;</li>
        <li>send spam or unsolicited bulk messages;</li>
        <li>try to access other people&apos;s accounts, events or data, or probe or disrupt the service;</li>
        <li>submit false payment references or forged proof of payment.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>

      <h2>Plans and payments</h2>
      <ul>
        <li>Free, Premium and Pro apply to a single event. Unlimited applies to your whole account. Prices are shown in Philippine pesos on the pricing section and at checkout.</li>
        <li>Every plan is a one-time payment. There are no automatic renewals.</li>
        <li>Payments are made manually. You pay through your own banking or e-wallet app, then upload proof. An administrator reviews it and, once approved, your plan is unlocked. Approval is not instant.</li>
        <li>Because plans are activated by hand after approval, refunds are handled case by case. Contact us if something went wrong.</li>
      </ul>

      <h2>Messages</h2>
      <p>
        Email and text delivery depends on outside providers and on the details you enter, so we cannot guarantee that every message arrives. Delivery status shown in the dashboard reflects what the provider reported.
      </p>

      <h2>Availability</h2>
      <p>
        We work to keep the service running, but it is provided &quot;as is&quot;. It may occasionally be unavailable, and we may change or remove features. Keep your own copy of anything important, such as your guest list, which you can export as a CSV file.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, Events Partner is not liable for indirect or consequential losses, such as a missed event, an undelivered invitation or lost data. Nothing here limits rights you have under the law that cannot be limited.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can stop using the service at any time and ask us to delete your account. We may suspend or close accounts that break these terms.
      </p>

      <h2>Changes</h2>
      <p>If these terms change in a meaningful way, the date at the top of the page will be updated. Continuing to use the service after that means you accept the new terms.</p>
    </LegalPage>
  )
}
