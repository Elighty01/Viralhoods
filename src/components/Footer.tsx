import React from 'react';
import { User } from '../types';
import { BrandLogo, SocialMediaBadges } from './BrandLogo';
import { Shield } from 'lucide-react';

interface FooterProps {
  currentUser: User | null;
  onNavigate: (view: 'about' | 'admin' | 'brand' | 'community') => void;
}

export const Footer: React.FC<FooterProps> = ({ currentUser, onNavigate }) => {
  return (
    <footer id="f">
      <div className="w">
        <div className="footer-top-row">
          <BrandLogo size="sm" showTagline={false} />

          <nav className="footer-nav" aria-label="Footer navigation">
            <button type="button" onClick={() => onNavigate('about')}>
              About & Editorial Standards
            </button>
            <button type="button" onClick={() => onNavigate('community')}>
              Community
            </button>
            <button type="button" onClick={() => onNavigate('brand')}>
              Brand Kit & Logo
            </button>

            {/* Discreet Console link only rendered for active admin session */}
            {currentUser?.isAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                style={{
                  color: 'var(--fg-muted)',
                  fontWeight: 500,
                }}
              >
                Editorial Console
              </button>
            )}
          </nav>
        </div>

        {/* Official Channels Block from Brand Image */}
        <div className="footer-channels-block">
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--fg)' }}>
            Follow Viralhoods Everywhere:
          </span>
          <SocialMediaBadges />
        </div>

        <p className="footer-disclaimer">
          © {new Date().getFullYear()} Viralhoods. All rights reserved. Viralhoods synthesizes and reports trending developments in its own words across politics, finance, science, health, research, sports, and AI. No automated link forwarding or copying. All reporting is verified and edited for clarity.
        </p>
      </div>
    </footer>
  );
};
