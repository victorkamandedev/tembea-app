import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function Auth({ user }) {
  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <>
          <img
            src={user.photoURL}
            alt="avatar"
            className="w-8 h-8 rounded-full"
          />
          <span className="text-sm">{user.displayName}</span>
          <button
            onClick={logOut}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded"
          >
            Logout
          </button>
        </>
      ) : (
        <button
          onClick={signIn}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Login with Google
        </button>
      )}
    </div>
  );
}
