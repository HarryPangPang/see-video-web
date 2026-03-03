import React from 'react';
import { Link } from 'react-router-dom';
import './legal.scss';

export function TermsOfService() {
  return (
    <div className="legal-container">
      <div className="legal-box">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: March 2025</p>

        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using our services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Use of Service</h2>
          <p>
            You agree to use the service only for lawful purposes and in accordance with these terms. You must not misuse the service, attempt to gain unauthorized access, or interfere with other users.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Account Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and for all activities under your account. You must notify us promptly of any unauthorized use.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Intellectual Property</h2>
          <p>
            The service and its content, features, and functionality are owned by us and are protected by intellectual property laws. Your use does not grant you any rights to our trademarks or content except as expressly permitted.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the revised terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us through the channels provided in our app or website.
          </p>
        </section>

        <div className="legal-footer">
          <Link to="/login">Back to Login</Link>
          <span className="legal-sep">·</span>
          <Link to="/privacy-policy">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
