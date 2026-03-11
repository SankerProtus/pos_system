import { useState } from "react";
import {
  FormInput,
  Button,
  Alert,
  PasswordStrengthIndicator,
  GoogleOAuthButton,
} from "../components/common";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Mail, Lock, User, Save, Trash, Download } from "lucide-react";

/**
 * Component Showcase Page
 * This page demonstrates all the reusable authentication components
 * Use this for testing, development, and design review
 */

export const ComponentShowcasePage = () => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Component Showcase
          </h1>
          <p className="text-lg text-slate-600">
            All authentication components in one place
          </p>
        </div>

        {/* AuthLayout Preview */}
        <section className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Auth Layout
          </h2>
          <p className="text-slate-600 mb-6">
            Consistent wrapper for all authentication pages with branding and
            footer.
          </p>
          <div className="border-2 border-slate-200 rounded-lg overflow-hidden">
            <div className="scale-75 origin-top">
              <AuthLayout
                title="Sample Page"
                subtitle="This is how the layout looks"
              >
                <div className="space-y-4">
                  <p className="text-slate-600">
                    Page content goes here. The layout includes:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>RetailPOS branding with icon</li>
                    <li>Page title and subtitle</li>
                    <li>White card container</li>
                    <li>Footer with links</li>
                    <li>Gradient background</li>
                  </ul>
                </div>
              </AuthLayout>
            </div>
          </div>
        </section>

        {/* FormInput Component */}
        <section className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Form Input</h2>
          <p className="text-slate-600 mb-6">
            Full-featured input component with icons, error states, and password
            toggle.
          </p>
          <div className="space-y-6 max-w-md">
            <FormInput
              id="demo-email"
              label="Email Address"
              type="email"
              placeholder="your.email@store.com"
              icon={Mail}
            />

            <FormInput
              id="demo-name"
              label="Full Name"
              type="text"
              placeholder="John Doe"
              icon={User}
              error="This field is required"
            />

            <FormInput
              id="demo-password"
              label="Password"
              placeholder="Enter your password"
              icon={Lock}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
            />

            <FormInput
              id="demo-disabled"
              label="Disabled Input"
              type="text"
              placeholder="This is disabled"
              disabled
            />
          </div>
        </section>

        {/* Button Component */}
        <section className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Buttons</h2>
          <p className="text-slate-600 mb-6">
            Multi-variant button component with loading states and icons.
          </p>

          <div className="space-y-8">
            {/* Variants */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Variants
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" icon={Save}>
                  Primary
                </Button>
                <Button variant="secondary" icon={User}>
                  Secondary
                </Button>
                <Button variant="outline" icon={Download}>
                  Outline
                </Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger" icon={Trash}>
                  Danger
                </Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Sizes
              </h3>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary" size="sm">
                  Small
                </Button>
                <Button variant="primary" size="md">
                  Medium
                </Button>
                <Button variant="primary" size="lg">
                  Large
                </Button>
              </div>
            </div>

            {/* States */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                States
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" loading={loading}>
                  {loading ? "Loading..." : "Click to Load"}
                </Button>
                <Button variant="secondary" onClick={handleLoadingDemo}>
                  Trigger Loading
                </Button>
                <Button variant="outline" disabled>
                  Disabled
                </Button>
              </div>
            </div>

            {/* Full Width */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Full Width
              </h3>
              <Button variant="primary" fullWidth icon={Save}>
                Full Width Button
              </Button>
            </div>
          </div>
        </section>

        {/* Alert Component */}
        <section className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Alerts</h2>
          <p className="text-slate-600 mb-6">
            Contextual notification component for various message types.
          </p>
          <div className="space-y-4 max-w-2xl">
            <Alert type="success" message="This is a success message!" />
            <Alert
              type="error"
              message="An error occurred. Please try again."
            />
            <Alert
              type="warning"
              message="Warning: Your session will expire soon."
            />
            <Alert
              type="info"
              message="We've sent a verification code to your email."
            />
          </div>
        </section>

        {/* Password Strength Indicator */}
        <section className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Password Strength Indicator
          </h2>
          <p className="text-slate-600 mb-6">
            Real-time password strength validation with visual feedback.
          </p>
          <div className="max-w-md space-y-4">
            <FormInput
              id="demo-password-strength"
              label="Try typing a password"
              type="password"
              placeholder="Type to see strength indicator"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordStrengthIndicator password={password} />

            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Try these passwords:
              </p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• "test" → Very Weak</li>
                <li>• "Test1234" → Fair</li>
                <li>• "Test1234!" → Good</li>
                <li>• "MyStr0ng!Pass" → Strong</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Google OAuth Button */}
        <section className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Google OAuth Button
          </h2>
          <p className="text-slate-600 mb-6">
            Pre-styled Google sign-in button with official branding.
          </p>
          <div className="max-w-md space-y-3">
            <GoogleOAuthButton
              onClick={() => alert("Google login clicked!")}
              text="Continue with Google"
            />
            <GoogleOAuthButton
              onClick={() => {}}
              text="Sign up with Google"
            />
          </div>
        </section>

        {/* Code Example */}
        <section className="bg-slate-900 rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-white mb-4">Usage Example</h2>
          <pre className="text-sm text-green-400 overflow-x-auto">
            {`import { FormInput, Button, Alert } from "./components/common";
import { Mail, Save } from "lucide-react";

<FormInput
  id="email"
  label="Email Address"
  type="email"
  placeholder="your.email@store.com"
  icon={Mail}
  error={errors.email?.message}
/>

<Button
  variant="primary"
  size="lg"
  fullWidth
  loading={isLoading}
  icon={Save}
>
  Save Changes
</Button>

<Alert 
  type="success" 
  message="Changes saved successfully!" 
/>`}
          </pre>
        </section>
      </div>
    </div>
  );
};
