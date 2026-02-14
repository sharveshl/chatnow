import Profile from "../Components/Profile";
function Welcome(){
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center justify-start border rounded-md p-10 h-120 w-250">
                <h1 className="text-3xl font-bold">
                    Welcome to ChatNow!
                </h1>
                <p className="text-lg text-gray-600 mt-4">
                    Your one-stop solution for seamless communication.
                </p>
                <div className="pt-8">
                    <Profile />
                </div>
                <h3 className="text-sm text-gray-500 mt-6">
                    Please log in or sign up to continue with new account.
                </h3>
                <div className="flex flex-row items-center justify-center mt-4 space-x-4">
                    <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                        Log In
                    </button>
                    <button className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
                        Sign Up
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Welcome;