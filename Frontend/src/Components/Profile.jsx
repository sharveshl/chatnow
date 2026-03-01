function Profile({ name, email, onClick, isSelected }) {
    const initial = name ? name.charAt(0).toUpperCase() : "?";

    return (
        <button
            onClick={onClick}
            className={`
                flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer
                border-2 transition-all duration-200 min-w-[120px] max-w-[140px]
                ${isSelected
                    ? 'border-[#0084FF] bg-[#0084FF] text-white shadow-lg scale-[1.02]'
                    : 'border-[#2a2a35] bg-[#111118] hover:border-[#0084FF]/50 hover:shadow-md'
                }
            `}
        >
            {/* Avatar */}
            <div className={`
                w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold mb-2
                ${isSelected
                    ? 'bg-white text-[#0066FF]'
                    : 'bg-[#0055CC] text-blue-200'
                }
            `}>
                {initial}
            </div>

            {/* Name */}
            <h3 className={`text-sm font-medium truncate w-full text-center
                ${isSelected ? 'text-white' : 'text-neutral-200'}
            `}>
                {name}
            </h3>

            {/* Email */}
            <p className={`text-xs truncate w-full text-center mt-0.5
                ${isSelected ? 'text-blue-100' : 'text-neutral-500'}
            `}>
                {email}
            </p>
        </button>
    );
}

export default Profile;