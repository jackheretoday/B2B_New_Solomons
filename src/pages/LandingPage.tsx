import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, Role } from '../auth';

import before1 from '../assets/pothole images before & affter/Before-1.png';
import after1 from '../assets/pothole images before & affter/After-1.png';
import before2 from '../assets/pothole images before & affter/Before-2.png';
import after2 from '../assets/pothole images before & affter/After-2.png';

function AuthModal({ onClose, onSuccess, initialIntention }: { onClose: () => void, onSuccess: () => void, initialIntention: 'report' | 'track' | 'login' }) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    let timer: any;
    if (step === 'otp' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (phone.length < 10) {
      setError('Please enter a valid mobile number.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
      setTimeLeft(30);
    }, 1000);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (code === '000000') {
        setError('Incorrect verification code. Please try again.');
      } else {
        onSuccess();
      }
    }, 1500);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-paper border border-line shadow-2xl max-w-[900px] w-full flex flex-col md:flex-row relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center font-bold text-xl hover:bg-inset z-10">&times;</button>
        
        {/* Left Side - Branding */}
        <div className="hidden md:flex flex-col justify-between w-1/2 bg-surface border-r border-line p-10">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-2">FixMeraMarg</h2>
            <p className="text-ink-muted">Report civic issues and track progress.</p>
          </div>
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full border border-line flex items-center justify-center shrink-0 font-bold text-sm bg-paper">1</div>
              <p className="text-sm font-bold mt-1.5">Verify your mobile number</p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full border border-line flex items-center justify-center shrink-0 font-bold text-sm bg-paper">2</div>
              <p className="text-sm font-bold mt-1.5">
                {initialIntention === 'report' ? 'Submit your complaint' : initialIntention === 'track' ? 'Track your complaints' : 'Access your dashboard'}
              </p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full border border-line flex items-center justify-center shrink-0 font-bold text-sm bg-paper">3</div>
              <p className="text-sm font-bold mt-1.5">Get real-time updates</p>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-paper min-h-[500px]">
          {step === 'phone' ? (
            <div className="animate-fade-in">
              <h2 className="font-serif text-3xl font-bold mb-2">Sign in to continue</h2>
              <p className="text-ink-muted mb-8">Use your mobile number to securely sign in.</p>
              
              <form onSubmit={handleSendOtp}>
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Mobile Number</label>
                <div className="flex border border-line focus-within:border-brand bg-surface mb-2 transition-colors">
                  <div className="px-4 py-4 border-r border-line font-bold text-ink-muted bg-inset">+91</div>
                  <input 
                    type="tel" 
                    className="flex-1 bg-transparent px-4 py-4 focus:outline-none font-mono text-lg tracking-wider"
                    placeholder="00000 00000"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    autoFocus
                  />
                </div>
                {error && <p className="text-status-reported text-xs font-bold mb-4">{error}</p>}
                
                <button 
                  type="submit" 
                  disabled={loading || phone.length < 10}
                  className="w-full bg-brand text-paper font-bold py-4 mt-6 hover:bg-ink disabled:opacity-50 disabled:hover:bg-brand transition-none"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
              <p className="text-xs text-ink-muted mt-6 leading-relaxed">
                We'll use your mobile number to securely sign you in and keep you updated about your complaints. No passwords required.
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <h2 className="font-serif text-3xl font-bold mb-2">Enter verification code</h2>
              <p className="text-ink-muted mb-8">We've sent a 6-digit code to <span className="font-bold text-ink">+91 {phone.slice(0,5)} {phone.slice(5)}</span></p>
              
              <form onSubmit={handleVerify}>
                <div className="flex gap-2 justify-between mb-4">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 border border-line bg-surface text-center font-mono text-xl focus:outline-none focus:border-brand focus:bg-paper transition-colors"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                {error && <p className="text-status-reported text-xs font-bold mb-4">{error}</p>}
                
                <button 
                  type="submit" 
                  disabled={loading || otp.join('').length < 6}
                  className="w-full bg-brand text-paper font-bold py-4 mt-4 hover:bg-ink disabled:opacity-50 disabled:hover:bg-brand transition-none"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </form>
              
              <div className="mt-8 flex flex-col items-center gap-4 text-sm font-bold">
                <button onClick={() => { setStep('phone'); setOtp(['','','','','','']); setError(''); }} className="text-ink-muted hover:text-ink underline">
                  Change mobile number
                </button>
                {timeLeft > 0 ? (
                  <span className="text-ink-muted">Resend OTP in 00:{timeLeft.toString().padStart(2, '0')}</span>
                ) : (
                  <button onClick={(e) => { setOtp(['','','','','','']); handleSendOtp(e); }} className="text-brand hover:text-ink underline">
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkflowAnimation() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
          }
        });
      },
      { threshold: 0.5 }
    );
    
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const steps = [
    { num: '01', title: 'Report', desc: 'Tell us what needs attention and pin the exact location on the map.' },
    { num: '02', title: 'Verification', desc: 'The submitted complaint goes through the platform\'s verification process.' },
    { num: '03', title: 'Action', desc: 'The concerned municipal team reviews and acts on the issue.' },
    { num: '04', title: 'Track', desc: 'Follow the progress online until the issue is officially marked resolved.' },
  ];

  return (
    <div className="max-w-md mx-auto relative py-4">
      {/* Vertical connecting line */}
      <div className="absolute left-6 md:left-[2.75rem] top-8 bottom-8 w-[2px] bg-line z-0"></div>
      
      {steps.map((step, i) => (
        <div 
          key={step.num}
          className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-700 ease-out flex gap-6 relative z-10 mb-12 last:mb-0 group"
          style={{ transitionDelay: `${i * 150}ms` }}
        >
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-brand text-paper flex items-center justify-center font-bold text-lg md:text-xl shrink-0 border-[6px] border-surface shadow-sm transition-transform duration-500 group-hover:scale-110">
            {step.num}
          </div>
          <div className="pt-2 md:pt-4">
            <h3 className="font-bold text-xl mb-2">{step.title}</h3>
            <p className="text-ink-muted text-sm md:text-base leading-relaxed">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [authIntention, setAuthIntention] = useState<'report' | 'track' | 'login' | null>(null);
  const { setRole } = useAuth();
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    // For demo purposes, log in as citizen1
    setRole('citizen1');
    if (authIntention === 'report') navigate('/report');
    else if (authIntention === 'track') navigate('/my-reports');
    else navigate('/map'); // default
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-paper text-ink font-sans">
      {/* Landing Header */}
      <header className="bg-surface border-b border-line flex items-center justify-between p-4 md:px-8 z-50 sticky top-0">
        <div className="flex items-center gap-8">
          <div className="font-serif font-bold text-2xl tracking-wide">FixMeraMarg</div>
          <nav className="hidden lg:flex gap-6 text-sm font-bold text-ink-muted">
            <button onClick={() => window.scrollTo(0, 0)} className="hover:text-ink">Home</button>
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-ink">How It Works</button>
            <button onClick={() => scrollTo('recent-work')} className="hover:text-ink">Recent Work</button>
            <button onClick={() => setAuthIntention('track')} className="hover:text-ink">Track Complaint</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setAuthIntention('login')} className="hidden md:block text-sm font-bold hover:underline">Login</button>
          <button onClick={() => setAuthIntention('report')} className="bg-brand text-paper text-sm font-bold px-5 py-2.5 hover:bg-ink transition-none">
            Report an Issue
          </button>
        </div>
      </header>

      <main className="flex-1">
        
        {/* Hero Section */}
        <section className="py-20 md:py-32 px-4 border-b border-line relative overflow-hidden bg-surface">
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-ink) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <p className="text-xs font-bold text-brand uppercase tracking-widest mb-6">Public Infrastructure • Citizen Reporting</p>
            <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
              See a problem on your street?<br />Help get it fixed.
            </h1>
            <p className="text-lg md:text-xl text-ink-muted mb-12 max-w-2xl mx-auto leading-relaxed">
              Report potholes, damaged roads, streetlights, drainage problems and other public infrastructure issues. FixMeraMarg helps connect citizen complaints with the concerned authorities and keeps you informed about progress.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => setAuthIntention('report')} className="bg-brand text-paper font-bold text-lg px-8 py-4 hover:bg-ink transition-none">
                Report an Issue
              </button>
              <button onClick={() => setAuthIntention('track')} className="border border-ink bg-paper font-bold text-lg px-8 py-4 hover:bg-inset transition-none">
                Track a Complaint
              </button>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-16 md:py-24 px-4 border-b border-line bg-paper">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center font-serif text-3xl font-bold mb-16">Built for transparent civic issue reporting</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              <div className="text-center md:text-left flex flex-col items-center md:items-start">
                <div className="w-12 h-12 bg-surface border border-line rounded-full flex items-center justify-center mb-6 text-xl">✓</div>
                <h3 className="font-bold text-xl mb-3">Verified Complaints</h3>
                <p className="text-ink-muted leading-relaxed">Reports are reviewed before action is taken, ensuring resources are deployed effectively.</p>
              </div>
              <div className="text-center md:text-left flex flex-col items-center md:items-start">
                <div className="w-12 h-12 bg-surface border border-line rounded-full flex items-center justify-center mb-6 text-xl">🏢</div>
                <h3 className="font-bold text-xl mb-3">Assigned to the Concerned Team</h3>
                <p className="text-ink-muted leading-relaxed">Complaints are routed directly to the relevant department or municipal authority.</p>
              </div>
              <div className="text-center md:text-left flex flex-col items-center md:items-start">
                <div className="w-12 h-12 bg-surface border border-line rounded-full flex items-center justify-center mb-6 text-xl">📍</div>
                <h3 className="font-bold text-xl mb-3">Track Progress</h3>
                <p className="text-ink-muted leading-relaxed">Citizens can follow the status of their report from initial submission to final resolution.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-16 md:py-24 px-4 border-b border-line bg-surface">
          <div className="max-w-3xl mx-auto">
            <div className="mb-16 text-center">
              <h2 className="font-serif text-4xl font-bold mb-4">How it works</h2>
              <p className="text-ink-muted text-lg">A simple process connecting citizens with civic authorities.</p>
            </div>

            <WorkflowAnimation />
          </div>
        </section>

        {/* Work That Got Done */}
        <section id="recent-work" className="py-16 md:py-24 px-4 border-b border-line bg-paper">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16 md:text-center">
              <h2 className="font-serif text-4xl font-bold mb-4">From Complaint to Completion</h2>
              <p className="text-ink-muted text-lg">See examples of public infrastructure issues that have been addressed.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Example 1 */}
              <div className="border border-line bg-surface flex flex-col">
                <div className="grid grid-cols-2 border-b border-line">
                  <div className="relative p-2 border-r border-line">
                    <div className="absolute top-4 left-4 bg-paper text-ink border border-line text-xs font-bold px-2 py-1 uppercase tracking-widest z-10">Before</div>
                    <div className="aspect-[4/3] bg-ink/5 relative overflow-hidden flex items-center justify-center">
                       <img src={before1} alt="Before repair" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="relative p-2">
                    <div className="absolute top-4 left-4 bg-brand text-paper text-xs font-bold px-2 py-1 uppercase tracking-widest z-10">After</div>
                    <div className="aspect-[4/3] bg-status-resolved/10 relative overflow-hidden flex items-center justify-center">
                       <img src={after1} alt="After repair" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
                <div className="p-6 md:p-8 bg-paper">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-serif text-2xl font-bold mb-1">Road Pothole</h3>
                      <p className="text-ink-muted">Andheri East</p>
                    </div>
                    <div className="bg-surface border border-line px-3 py-1 text-xs font-bold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-status-resolved"></div>
                      Resolved
                    </div>
                  </div>
                  <div className="text-sm border-t border-line pt-4 flex gap-6">
                    <div>
                      <p className="text-xs text-ink-muted uppercase tracking-widest font-bold mb-1">Completed</p>
                      <p className="font-bold">September 2026</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted uppercase tracking-widest font-bold mb-1">Authority</p>
                      <p className="font-bold">Roads Dept.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Example 2 */}
              <div className="border border-line bg-surface flex flex-col">
                <div className="grid grid-cols-2 border-b border-line">
                  <div className="relative p-2 border-r border-line">
                    <div className="absolute top-4 left-4 bg-paper text-ink border border-line text-xs font-bold px-2 py-1 uppercase tracking-widest z-10">Before</div>
                    <div className="aspect-[4/3] bg-ink/5 relative overflow-hidden flex items-center justify-center">
                       <img src={before2} alt="Before repair" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="relative p-2">
                    <div className="absolute top-4 left-4 bg-brand text-paper text-xs font-bold px-2 py-1 uppercase tracking-widest z-10">After</div>
                    <div className="aspect-[4/3] bg-status-resolved/10 relative overflow-hidden flex items-center justify-center">
                       <img src={after2} alt="After repair" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
                <div className="p-6 md:p-8 bg-paper">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-serif text-2xl font-bold mb-1">Damaged Road</h3>
                      <p className="text-ink-muted">Bandra West</p>
                    </div>
                    <div className="bg-surface border border-line px-3 py-1 text-xs font-bold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-status-resolved"></div>
                      Resolved
                    </div>
                  </div>
                  <div className="text-sm border-t border-line pt-4 flex gap-6">
                    <div>
                      <p className="text-xs text-ink-muted uppercase tracking-widest font-bold mb-1">Completed</p>
                      <p className="font-bold">October 2026</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted uppercase tracking-widest font-bold mb-1">Authority</p>
                      <p className="font-bold">Electricity Dept.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section className="py-16 md:py-24 px-4 bg-brand text-paper border-b border-line">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-paper/20">
              <div className="py-6 md:py-0">
                <p className="text-xs font-bold uppercase tracking-widest mb-4 opacity-80">Reports Submitted</p>
                <p className="font-serif text-6xl md:text-7xl font-bold">1,284</p>
              </div>
              <div className="py-6 md:py-0">
                <p className="text-xs font-bold uppercase tracking-widest mb-4 opacity-80">Issues Resolved</p>
                <p className="font-serif text-6xl md:text-7xl font-bold">927</p>
              </div>
              <div className="py-6 md:py-0">
                <p className="text-xs font-bold uppercase tracking-widest mb-4 opacity-80">Areas Covered</p>
                <p className="font-serif text-6xl md:text-7xl font-bold">42</p>
              </div>
            </div>
            <p className="text-center text-xs opacity-60 mt-12 uppercase tracking-widest">Platform Demo Statistics</p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-line pt-16 pb-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-12 mb-16">
          <div className="max-w-sm">
            <h2 className="font-serif text-2xl font-bold mb-4">FixMeraMarg</h2>
            <p className="text-ink-muted leading-relaxed mb-6">
              A civic infrastructure reporting platform bridging the gap between citizens and municipal authorities.
            </p>
            <button onClick={() => setAuthIntention('report')} className="font-bold hover:underline">Report an Issue &rarr;</button>
          </div>
          <div className="flex gap-12 md:gap-24">
            <div>
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-6">For Citizens</h3>
              <ul className="space-y-4 text-sm font-bold">
                <li><button onClick={() => window.scrollTo(0,0)} className="hover:underline">Home</button></li>
                <li><button onClick={() => setAuthIntention('report')} className="hover:underline">Report an Issue</button></li>
                <li><button onClick={() => setAuthIntention('track')} className="hover:underline">Track Complaint</button></li>
                <li><button onClick={() => scrollTo('how-it-works')} className="hover:underline">How It Works</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-6">Legal</h3>
              <ul className="space-y-4 text-sm font-bold">
                <li><Link to="/privacy" className="hover:underline">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:underline">Terms of Use</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto border-t border-line pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-ink-muted font-bold">
          <p>&copy; {new Date().getFullYear()} FixMeraMarg Civic Tech.</p>
          <p>Designed for public service.</p>
        </div>
      </footer>

      {authIntention && (
        <AuthModal 
          initialIntention={authIntention}
          onClose={() => setAuthIntention(null)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
