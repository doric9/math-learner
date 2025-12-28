import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const { login, signup, loginWithGoogle } = useAuth();
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            if (isSignup) {
                await signup(email, password);
            } else {
                await login(email, password);
            }
            navigate('/dashboard');
        } catch (err) {
            setError(`Failed to ${isSignup ? 'sign up' : 'sign in'}: ` + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleLogin() {
        try {
            setError('');
            setLoading(true);
            await loginWithGoogle();
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to sign in with Google: ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg border border-gray-100">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        {isSignup ? 'Create account' : 'Sign in to account'}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {isSignup ? 'Start your competitive math journey' : 'Access your learning dashboard'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-md"
                        >
                            {isSignup ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500 uppercase tracking-wider text-xs font-semibold">Or continue with</span>
                    </div>
                </div>

                <div>
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm"
                    >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.1H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.9l3.66-2.78z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.1L5.84 9.94c.87-2.6 3.3-4.56 6.16-4.56z"
                                    fill="#EA4335"
                                />
                            </svg>
                        </span>
                        Google
                    </button>
                </div>

                <div className="text-center space-y-3">
                    <p className="text-sm text-gray-600">
                        {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            onClick={() => setIsSignup(!isSignup)}
                            className="font-bold text-indigo-600 hover:text-indigo-500"
                        >
                            {isSignup ? 'Log In' : 'Sign Up'}
                        </button>
                    </p>
                    <div>
                        <button
                            onClick={() => navigate('/')}
                            className="text-xs font-semibold text-gray-400 hover:text-gray-600 tracking-wide uppercase"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
