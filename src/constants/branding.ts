/**
 * Application Branding Constants
 * Centralized branding configuration for QA Intelligence
 */

export const APP_BRANDING = {
  name: 'QA Intelligence',
  tagline: 'Smart Test Management & Self-Healing System',
  description: 'Enterprise-grade test automation management platform with intelligent self-healing capabilities for WeSign document signing workflows',
  version: '1.0.0',
  
  // Login page specific
  loginTitle: 'QA Intelligence',
  loginTagline: 'Smart Test Management & Self-Healing System',
  loginDescription: 'Enter your credentials to access the platform',
  
  // Navigation
  navTitle: 'QA Intelligence',
  
  // Meta tags
  metaTitle: 'QA Intelligence',
  metaDescription: 'QA Intelligence - Smart Test Management & Self-Healing System',
  metaKeywords: 'QA Intelligence, Testing, Test Management, Analytics, E2E Testing, Browser Testing, Self-Healing',
  
  // Environment
  environmentLabel: 'Staging',
  
  // Demo credentials (for development)
  demo: {
    email: 'admin@demo.com',
    password: 'demo123'
  }
} as const;

export type AppBranding = typeof APP_BRANDING;