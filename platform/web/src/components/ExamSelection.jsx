import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ExamSelection = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const examsRef = collection(
          db,
          'competitions',
          'amc8',
          'exams'
        );

        const q = query(examsRef, orderBy('year', 'desc'));
        const snapshot = await getDocs(q);

        const examList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setExams(examList);
      } catch (error) {
        console.error('Error fetching exams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-indigo-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-800">AMC8 <span className="text-indigo-600">Guided</span></span>
            </div>

            <div className="flex items-center gap-6">
              {currentUser ? (
                <div className="flex items-center gap-4">
                  <span className="hidden sm:block text-sm font-medium text-slate-600">
                    Welcome, {currentUser.displayName?.split(' ')[0] || 'Student'}
                  </span>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            Master the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">AMC 8</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Personalized practice paths, AI-guided solutions, and full-length mock exams
            designed to help you excel in competitive mathematics.
          </p>
        </div>

        {/* Exam Selection Header */}
        <div className="flex items-end justify-between mb-8 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Available Exams</h2>
            <p className="text-sm text-slate-500">Choose a year to begin your practice session</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <div className="w-16 h-16 bg-slate-900 rounded-full"></div>
              </div>

              <div className="mb-8">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block">
                  Standard Exam
                </span>
                <h3 className="text-3xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {exam.year}
                </h3>
                <p className="text-slate-500 mt-1 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012 2v2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                  {exam.totalProblems || 25} Problems
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/guided/${exam.year}`)}
                  className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-[0.98]"
                >
                  <span className="text-xl">✨</span> AI Guided Practice
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate(`/practice/${exam.year}`)}
                    className="bg-white text-slate-700 font-bold py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                    Classic
                  </button>
                  <button
                    onClick={() => navigate(`/test/${exam.year}`)}
                    className="bg-white text-slate-700 font-bold py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                    Mock Test
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {exams.length === 0 && (
          <div className="text-center text-slate-500 mt-20 p-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-xl font-medium">No exams found.</p>
            <p className="mt-2 text-sm text-slate-400">Please run the data ingestion script to populate the database.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExamSelection;
