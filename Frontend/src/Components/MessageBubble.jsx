function MessageBubble({ message, isOwn }) {
    const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    const renderStatus = () => {
        if (!isOwn) return null;

        const status = message.status || 'sent';

        if (status === 'read') {
            return (
                <span className="ml-1 inline-flex items-center" title="Read">
                    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.071 0.653a.5.5 0 0 1 .058.706l-5.5 6.5a.5.5 0 0 1-.736.017L2.543 5.478a.5.5 0 0 1 .714-.7l2.01 2.044 5.098-6.11a.5.5 0 0 1 .706-.059z" fill="#08ee00ff" />
                        <path d="M14.071 0.653a.5.5 0 0 1 .058.706l-5.5 6.5a.5.5 0 0 1-.736.017l-.5-.508a.5.5 0 0 1 .714-.7l.147.15 5.111-6.106a.5.5 0 0 1 .706-.059z" fill="#08ee00ff" />
                    </svg>
                </span>
            );
        }

        if (status === 'delivered') {
            return (
                <span className="ml-1 inline-flex items-center" title="Delivered">
                    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.071 0.653a.5.5 0 0 1 .058.706l-5.5 6.5a.5.5 0 0 1-.736.017L2.543 5.478a.5.5 0 0 1 .714-.7l2.01 2.044 5.098-6.11a.5.5 0 0 1 .706-.059z" fill="#6B7280" />
                        <path d="M14.071 0.653a.5.5 0 0 1 .058.706l-5.5 6.5a.5.5 0 0 1-.736.017l-.5-.508a.5.5 0 0 1 .714-.7l.147.15 5.111-6.106a.5.5 0 0 1 .706-.059z" fill="#6B7280" />
                    </svg>
                </span>
            );
        }

        return (
            <span className="ml-1 inline-flex items-center" title="Sent">
                <svg width="12" height="11" viewBox="0 0 12 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.071 0.653a.5.5 0 0 1 .058.706l-5.5 6.5a.5.5 0 0 1-.736.017L.543 5.478a.5.5 0 0 1 .714-.7l2.01 2.044 5.098-6.11a.5.5 0 0 1 .706-.059z" fill="#6B7280" />
                </svg>
            </span>
        );
    };

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
            <div className={`
                max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                ${isOwn
                    ? 'bg-[#0084FF] text-white rounded-br-md'
                    : 'bg-[#2a2a35] text-neutral-100 rounded-bl-md'
                }
            `}>
                <p className="break-words">{message.content}</p>
                <div className={`flex items-center justify-end gap-0.5 mt-1
                    ${isOwn ? 'text-blue-200/70' : 'text-neutral-500'}
                `}>
                    <span className="text-[10px]">{time}</span>
                    {renderStatus()}
                </div>
            </div>
        </div>
    );
}

export default MessageBubble;
