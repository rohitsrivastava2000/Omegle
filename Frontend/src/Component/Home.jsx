import React from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center  text-white px-4" style={{
        backgroundImage: `
        linear-gradient(to bottom right, rgba(40, 40, 40, 0.9), rgba(10, 10, 10, 0.95)),
        url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' width='20' height='20' fill='none' stroke-width='1' stroke='%23222222'%3e%3cpath d='M0 .5H19.5V20'/%3e%3c/svg%3e")
      `,
        backgroundBlendMode: "overlay",
        backgroundRepeat: "repeat",
      }}>
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[rgb(233,126,1)]">
         Welcome to NextMeet
      </h1>
      
      <SignedOut>
        <SignInButton afterSignInUrl="/playground">
          <button className="bg-[rgb(30,115,232)] hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-lg font-medium shadow-md transition duration-200">
            Sign In to Continue
          </button>
        </SignInButton>
      </SignedOut>
      
      <SignedIn>
        <button 
          onClick={() => navigate('/playground')}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl text-lg font-medium shadow-md transition duration-200"
        >
          Get Started
        </button>
      </SignedIn>
    </div>
  );
}

export default Home;
