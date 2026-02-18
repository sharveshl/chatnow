function MessageBubble({ message, isOwn }) {
    const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
            <div className={`
                max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                ${isOwn
                    ? 'bg-neutral-900 text-white rounded-br-md'
                    : 'bg-neutral-100 text-neutral-900 rounded-bl-md'
                }
            `}>
                <p className="break-words">{message.content}</p>
                <p className={`text-[10px] mt-1 text-right
                    ${isOwn ? 'text-neutral-400' : 'text-neutral-400'}
                `}>
                    {time}
                </p>
            </div>
        </div>
    );
}

export default MessageBubble;
