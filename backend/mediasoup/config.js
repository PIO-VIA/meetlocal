const os = require('os');

// Obtenir l'IP locale du serveur
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Priorité : IPv4, non-interne, non-loopback
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0'; // Fallback
}

const SERVER_IP = process.env.MEDIASOUP_LISTEN_IP || getLocalIP();

module.exports = {
    // Number of mediasoup workers to launch
    // Default to number of CPU cores if not specified
    numWorkers: process.env.MEDIASOUP_WORKERS ? parseInt(process.env.MEDIASOUP_WORKERS) : Object.keys(os.cpus()).length,

    // Server IP configuration
    serverIp: SERVER_IP,

    // Mediasoup Worker settings
    worker: {
        rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT || 10000),
        rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT || 10100),
        logLevel: 'warn',
        logTags: [
            'info',
            'ice',
            'dtls',
            'rtp',
            'srtp',
            'rtcp'
            // 'rtx',
            // 'bwe',
            // 'score',
            // 'simulcast',
            // 'svc'
        ]
    },

    // Mediasoup Router settings
    router: {
        mediaCodecs: [
            {
                kind: 'audio',
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2
            },
            {
                kind: 'video',
                mimeType: 'video/VP8',
                clockRate: 90000,
                parameters: {
                    'x-google-start-bitrate': 1000
                }
            },
            {
                kind: 'video',
                mimeType: 'video/H264',
                clockRate: 90000,
                parameters: {
                    'packetization-mode': 1,
                    'profile-level-id': '42e01f',
                    'level-asymmetry-allowed': 1
                }
            }
        ]
    },

    // Mediasoup WebRtcTransport settings
    webRtcTransport: {
        listenIps: [
            {
                ip: '0.0.0.0',
                announcedIp: SERVER_IP
            }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
        minimumAvailableOutgoingBitrate: 600000,
        maxSctpMessageSize: 262144,
        maxIncomingBitrate: 1500000
    }
};
