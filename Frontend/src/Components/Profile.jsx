function Profile(){
    return (
        <div className="flex flex-col items-center justify-start h-50 w-50 border rounded-md">
            <div className="flex items-center justify-center h-15 w-15 pt-5">
                <img src="https://cdn-icons-png.flaticon.com/512/149/149071.png" alt="Profile" className="rounded-full h-15 w-15" />
            </div>
            <div className="pt-8">
                <h2 className="text-lg font-bold">John Doe</h2>
                <p className="text-sm text-gray-600">Software Engineer</p>
            </div>
            <div className="pt-4">
                <button className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600">
                    Log In
                </button>
            </div>
        </div>
    );
}

export default Profile;