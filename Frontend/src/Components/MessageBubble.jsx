function MessageBubble({ message, isOwn }) {
    const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    const riskLevel = message.riskLevel;
    const hasWarning = riskLevel && riskLevel !== 'none';

    const riskColors = {
        low: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: '⚠️' },
        medium: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '⚠️' },
        high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🛑' },
        critical: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', icon: '🚨' },
    };

    const riskStyle = riskColors[riskLevel] || riskColors.medium;

    const renderStatus = () => {
        if (!isOwn) return null;

        const status = message.status || 'sent';

        if (status === 'read') {
            return (
                <span className="ml-1 inline-flex items-center" title="Read">
                    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.071 0.653a.5.5 0 0 1 .058.706l-5.5 6.5a.5.5 0 0 1-.736.017L2.543 5.478a.5.5 0 0 1 .714-.7l2.01 2.044 5.098-6.11a.5.5 0 0 1 .706-.059z" fill="#5288c1" />
                        <path d="M14.071 0.653a.5.5 0 0 1 .058.706l-5.5 6.5a.5.5 0 0 1-.736.017l-.5-.508a.5.5 0 0 1 .714-.7l.147.15 5.111-6.106a.5.5 0 0 1 .706-.059z" fill="#5288c1" />
                    </svg>
                </span>
            );
        }

        if (status === 'delivered') {
            return (
                <span className="ml-1 inline-flex items-center" title="Delivered">
                    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.071 0.653a.5.5 0 0 1 .058.706l-5.5 6.5a.5.5 0 0 1-.736.017L2.543 5.478a.5.5 0 0 1 .714-.7l2.01 2.044 5.098-6.11a.5.5 0 0 1 .706-.059z" fill="#a0a5ab" />
                        <path d="M14.071 0.653a.5.5 0 0 1 .058.706l-5.5 6.5a.5.5 0 0 1-.736.017l-.5-.508a.5.5 0 0 1 .714-.7l.147.15 5.111-6.106a.5.5 0 0 1 .706-.059z" fill="#a0a5ab" />
                    </svg>
                </span>
            );
        }

        return (
            <span className="ml-1 inline-flex items-center" title="Sent">
                <svg width="12" height="11" viewBox="0 0 12 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.071 0.653a.5.5 0 0 1 .058.706l-5.5 6.5a.5.5 0 0 1-.736.017L.543 5.478a.5.5 0 0 1 .714-.7l2.01 2.044 5.098-6.11a.5.5 0 0 1 .706-.059z" fill="#a0a5ab" />
                </svg>
            </span>
        );
    };

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1.5`}>
            <div className="max-w-[65%]">
                <div className={`
                    px-3.5 py-2 rounded-xl text-sm leading-relaxed shadow-sm
                    ${isOwn
                        ? 'bg-[#e8f0fe] text-[#2c3e50] rounded-br-sm'
                        : 'bg-white text-[#2c3e50] rounded-bl-sm border border-[#e8ecf1]'
                    }
                `}>
                    <p className="break-words">{message.content}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1
                        ${isOwn ? 'text-[#5288c1]' : 'text-[#a0a5ab]'}
                    `}>
                        <span className="text-[10px]">{time}</span>
                        {renderStatus()}
                    </div>
                </div>

                {/* Security Warning Badge */}
                {hasWarning && (
                    <div className={`mt-1.5 px-3 py-1.5 rounded-lg ${riskStyle.bg} border ${riskStyle.border} ${isOwn ? 'ml-auto' : ''}`}>
                        <div className={`flex items-center gap-1.5 ${riskStyle.text}`}>
                            <span className="text-xs">{riskStyle.icon}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide">{riskLevel} risk</span>
                        </div>
                        {message.reasons?.length > 0 && (
                            <p className={`text-[10px] mt-0.5 ${riskStyle.text} opacity-80 leading-tight`}>
                                {message.reasons.slice(0, 2).join(' • ')}
                            </p>
                        )}
                    </div>
                )}

                {/* Scam Detection Badge */}
                {message.isScam && (
                    <div className={`mt-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 ${isOwn ? 'ml-auto' : ''}`}>
                        <div className="flex items-center gap-1.5 text-orange-700">
                            <span className="text-xs">🛡️</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide">Potential Scam</span>
                        </div>
                        <p className="text-[10px] mt-0.5 text-orange-600 opacity-80 leading-tight">
                            This message was flagged by AI scam detection
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MessageBubble;
