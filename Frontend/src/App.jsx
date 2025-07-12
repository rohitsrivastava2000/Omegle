import { Routes, Route, Navigate } from "react-router-dom";
import {
  SignIn,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useUser,
  SignUp,
} from "@clerk/clerk-react";
import Home from "./Component/Home";
import Room from "./PlayGround/room";
import { Toaster,toast } from "react-hot-toast";

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <RedirectToSignIn />;

  return children;
}

function App() {
  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{ duration: 3000 }}
      />
      <Routes>
       <Route path="/" element={<Home />} />
        <Route
          path="/playground"
          element={
            <>
              <SignedIn>
                <Room />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
        <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
        <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
      </Routes>
    </>
  );
}

export default App;
