import React from 'react';
import { Layout } from '../components/Layout';
import { Globe, Phone, Building, ExternalLink } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  return (
    <Layout title="Developer Profile">
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-10 w-full shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-24 h-24 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center mb-6">
              <Building size={40} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)] mb-2">Azure Dev Team</h1>
            <p className="text-[var(--color-text-secondary)]">Pioneering digital solutions with clean architectures.</p>
          </div>

          <div className="space-y-6">
            <a 
              href="tel:09169598057" 
              className="flex items-center p-5 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center mr-5 group-hover:scale-110 transition-transform">
                <Phone className="text-[var(--color-primary)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-tertiary)] mb-1">Contact Number</p>
                <p className="text-lg font-semibold text-[var(--color-text)]">0916 959 8057</p>
              </div>
              <ExternalLink size={20} className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors" />
            </a>

            <a 
              href="https://azure-website-gray.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center p-5 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center mr-5 group-hover:scale-110 transition-transform">
                <Globe className="text-[var(--color-primary)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-tertiary)] mb-1">Official Website</p>
                <p className="text-lg font-semibold text-[var(--color-text)]">azure-website-gray.vercel.app</p>
              </div>
              <ExternalLink size={20} className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};
