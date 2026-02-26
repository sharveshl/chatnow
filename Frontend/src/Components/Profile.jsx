function Profile({ name, email, onClick, isSelected }) {
    const initial = name ? name.charAt(0).toUpperCase() : "?";

    return (
        <button
            onClick={onClick}
            className={`
                flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer
                border-2 transition-all duration-200 min-w-[120px] max-w-[140px]
                ${isSelected
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg scale-[1.02]'
                    : 'border-neutral-200 bg-white hover:border-emerald-300 hover:shadow-md'
                }
            `}
        >
            {/* Avatar */}
            <div className={`
                w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold mb-2
                ${isSelected
                    ? 'bg-white text-emerald-600'
                    : 'bg-emerald-50 text-emerald-600'
                }
            `}>
                {initial}
            </div>

            {/* Name */}
            <h3 className={`text-sm font-medium truncate w-full text-center
                ${isSelected ? 'text-white' : 'text-neutral-800'}
            `}>
                {name}
            </h3>

            {/* Email */}
            <p className={`text-xs truncate w-full text-center mt-0.5
                ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}
            `}>
                {email}
            </p>
        </button>
    );
}

export default Profile;