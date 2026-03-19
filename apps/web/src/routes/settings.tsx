import { useState } from 'react';
import { Keyboard, Info, Server } from 'lucide-react';
import { KeyboardHelp } from '../components/ui/keyboard-help.js';
import { cn } from '../lib/cn.js';

interface SettingSection {
  id: string;
  title: string;
  icon: typeof Keyboard;
  content: React.ReactNode;
}

function KeyboardShortcutsSection() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        View all available keyboard shortcuts to navigate and interact with agents.
      </p>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white',
          'hover:bg-accent-hover transition-colors',
        )}
      >
        <Keyboard className="h-4 w-4" />
        View Keyboard Shortcuts
      </button>
      <KeyboardHelp open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

function GeneralSettingsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-2">API Configuration</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="api-url" className="block text-xs text-text-tertiary mb-1">
              API Server URL
            </label>
            <input
              id="api-url"
              type="text"
              defaultValue="http://localhost:3001"
              className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-primary mb-2">Terminal</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between max-w-sm">
            <label htmlFor="font-size" className="text-xs text-text-tertiary">
              Font Size
            </label>
            <select
              id="font-size"
              className="rounded border border-border bg-background px-2 py-1 text-xs text-text-primary"
              defaultValue="14"
            >
              <option value="12">12px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Server className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Command Center</h3>
          <p className="text-xs text-text-tertiary">Version 1.0.0</p>
        </div>
      </div>
      <p className="text-sm text-text-secondary">
        A unified interface for managing AI agents, monitoring their activity, and orchestrating
        complex workflows across multiple tmux sessions.
      </p>
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-text-tertiary">Built with React, TypeScript, and Vite</p>
      </div>
    </div>
  );
}

const sections: SettingSection[] = [
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    icon: Keyboard,
    content: <KeyboardShortcutsSection />,
  },
  {
    id: 'general',
    title: 'General',
    icon: Server,
    content: <GeneralSettingsSection />,
  },
  {
    id: 'about',
    title: 'About',
    icon: Info,
    content: <AboutSection />,
  },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('shortcuts');
  const currentSection = sections.find((s) => s.id === activeSection) as SettingSection;
  const CurrentIcon = currentSection.icon;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 items-center gap-3 border-b border-border px-6">
        <CurrentIcon className="h-5 w-5 text-text-secondary" />
        <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-56 border-r border-border p-4">
          <ul className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      activeSection === section.id
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6" role="main">
          <div className="max-w-2xl">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <CurrentIcon className="h-5 w-5 text-text-secondary" />
                <h2 className="text-lg font-semibold text-text-primary">{currentSection.title}</h2>
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-6">
              {currentSection.content}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
