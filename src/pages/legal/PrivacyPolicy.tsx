import React from 'react';
import { Link } from 'react-router-dom';
import './legal.scss';

export function PrivacyPolicy() {
  return (
    <div className="legal-container">
      <div className="legal-box">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: March 2025</p>

        <section className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            This Privacy Policy describes how we collect, use, and protect your information when you use our services. By using our platform, you agree to the practices described in this policy.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Information We Collect</h2>
          <p>We may collect:</p>
          <ul>
            <li>Account information (email, username, profile data)</li>
            <li>Usage data and analytics</li>
            <li>Device and browser information</li>
            <li>Cookies and similar technologies</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. How We Use Your Information</h2>
          <p>
            We use your information to provide, maintain, and improve our services; to communicate with you; and to comply with legal obligations.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Data Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information. We may share data with service providers who assist our operations, or when required by law.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Your Rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, or port your data, and to object to or restrict certain processing.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Contact</h2>
          <p>
            For privacy-related questions or requests, please contact us through the channels provided in our app or website.
          </p>
        </section>

        <div className="legal-footer">
          <Link to="/login">Back to Login</Link>
          <span className="legal-sep">·</span>
          <Link to="/terms-of-service">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
