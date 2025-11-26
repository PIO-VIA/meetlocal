'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { useSocket } from '@/hooks/useSocket';
import CreateMeetingForm from '@/components/Home/CreateMeetingForm';
import JoinMeetingForm from '@/components/Home/JoinMeetingForm';
import ActiveRoomsList from '@/components/Home/ActiveRoomsList';
import { Wifi, WifiOff, Shield, Zap, Users, Sun } from 'lucide-react';

export default function Home() {
  const { socket, isConnected } = useSocket();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [localIp, setLocalIp] = useState('192.168.1.100');
  const [qrUrl, setQrUrl] = useState('http://192.168.1.100:3000');

  useEffect(() => {
    const detectIp = () => {
      if (typeof window === 'undefined') return;
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(pc.setLocalDescription.bind(pc));
      pc.onicecandidate = (e) => {
        if (!e.candidate?.candidate) return;
        const match = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (match && match[1] !== '127.0.0.1') {
          setLocalIp(match[1]);
          setQrUrl(`http://${match[1]}:3000`);
        }
      };
    };
    detectIp();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100 text-gray-900 relative overflow-hidden">
      {/* Soleil doux en fond */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-sky-300/30 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-6 py-10 max-w-7xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl ring-8 ring-sky-400/30">
              <span className="text-3xl font-black text-white">LM</span>
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight">
                Local<span className="text-sky-600">Meet</span>
              </h1>
              <p className="text-xl text-gray-600 flex items-center gap-2">
                Visioconférence locale • 100 % sécurisée
              </p>
            </div>
          </div>

          {/* Statut */}
          <div className={`flex items-center gap-3 px-6 py-3 rounded-full font-semibold text-sm shadow-lg ${
            isConnected 
              ? 'bg-green-500 text-white' 
              : 'bg-orange-500 text-white'
          }`}>
            {isConnected ? <Wifi className="animate-pulse" size={20} /> : <WifiOff size={20} />}
            <span>{isConnected ? 'Connecté' : 'En attente...'}</span>
          </div>
        </header>

        {/* Hero + QR Code */}
        <section className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          {/* Gauche */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-black leading-tight mb-6 text-gray-800">
              Tu attends quoi ? 
              <span className="text-sky-600">Connectes toi 😎</span>
            </h2>
            <p className="text-xl text-gray-700 mb-10 leading-relaxed max-w-xl">
              Pas d’internet, pas de compte, pas de cloud.
              Juste votre réseau local et une classe connectée en 3 secondes.
            </p>

            {/* Tabs */}
            <div className="inline-flex bg-white rounded-2xl p-2 mb-10 shadow-xl border border-sky-200">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-10 py-4 rounded-xl font-bold text-lg transition-all ${
                  activeTab === 'create'
                    ? 'bg-sky-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Nouvelle réunion
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`px-10 py-4 rounded-xl font-bold text-lg transition-all ${
                  activeTab === 'join'
                    ? 'bg-sky-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Rejoindre
              </button>
            </div>

            {/* Formulaire */}
            <div className="bg-white rounded-3xl p-10 shadow-2xl border border-sky-200">
              {activeTab === 'create' ? (
                <CreateMeetingForm socket={socket} />
              ) : (
                <>
                  <JoinMeetingForm socket={socket} />
                  <ActiveRoomsList socket={socket} />
                </>
              )}
            </div>
          </motion.div>

          {/* Droite : QR Code */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className="bg-white p-10 rounded-3xl shadow-2xl border-8 border-sky-400 mb-8">
              <QRCode value={qrUrl} size={320} level="H" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-700 mb-4">
                Scannez avec votre téléphone
              </p>
              <code className="block text-xl font-mono bg-sky-100 text-sky-700 px-8 py-5 rounded-2xl border-2 border-sky-300">
                https://{localIp}:3000
              </code>
              <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(qrUrl);
                      // Feedback visuel (optionnel mais super utile)
                      const btn = document.activeElement as HTMLButtonElement;
                      const originalText = btn.textContent;
                      btn.textContent = 'Copié !';
                      btn.classList.add('text-green-600');
                      setTimeout(() => {
                        btn.textContent = originalText;
                        btn.classList.remove('text-green-600');
                      }, 1500);
                    } catch (err) {
                      // Fallback si clipboard bloqué → on copie via execCommand (toujours autorisé)
                      const textArea = document.createElement('textarea');
                      textArea.value = qrUrl;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);

                      // Même feedback
                      const btn = document.activeElement as HTMLButtonElement;
                      const originalText = btn.textContent;
                      btn.textContent = 'Copié (fallback) !';
                      setTimeout(() => btn.textContent = originalText, 1500);
                    }
                  }}
                  className="mt-6 text-sky-600 hover:text-sky-700 font-bold underline text-lg transition-all"
                >
                  Copier le lien
              </button>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
            {[
              { icon: Shield, color: 'sky', title: '100 % local', desc: 'Rien ne sort du réseau de l’école' },
              { icon: Zap, color: 'yellow', title: 'Instantané', desc: 'Connexion en moins de 3 secondes' },
              { icon: Users, color: 'blue', title: 'Toute la classe', desc: 'Plus de 100 étudiants en même temps' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="bg-white rounded-3xl p-10 shadow-xl border-4 border-sky-200 text-center"
              >
                <div className={`w-24 h-24 bg-${f.color}-100 rounded-full flex items-center justify-center mx-auto mb-6`}>
                  <f.icon className={`text-${f.color}-600`} size={48} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">{f.title}</h3>
                <p className="text-lg text-gray-600">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-12 text-gray-600 border-t-2 border-sky-200">
          <p className="text-lg font-medium">
            LocalMeet • Solution open-source • Université • 2025
          </p>
        </footer>
      </div>
    </main>
  );
}