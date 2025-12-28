import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, orderBy, where, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, BookOpen, Trophy, Zap, Clock, ChevronRight, BarChart3, Binary, Rocket, Search, Filter, Flame, Star, Award, X } from 'lucide-react';

const ExamSelection = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [results, setResults] = useState({});
  const [stats, setStats] = useState({ totalPoints: 0, examsCompleted: 0, badges: 0, streak: 0 });
  const [sandboxHint, setSandboxHint] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const revealRefs = useRef([]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const examsRef = collection(db, 'competitions', 'amc8', 'exams');
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
        setTimeout(() => setLoading(false), 600);
      }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!currentUser) return;
      try {
        const q = query(collection(db, 'users', currentUser.uid, 'results'));
        const snapshot = await getDocs(q);
        const progressMap = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const year = data.examYear;
          if (!progressMap[year] || data.score > progressMap[year].score) {
            progressMap[year] = { score: data.score, id: doc.id };
          }
        });
        setResults(progressMap);

        // Calculate Global Stats
        const totalPoints = Object.values(progressMap).reduce((acc, curr) => acc + curr.score, 0);
        const examsCompleted = Object.keys(progressMap).length;
        const badges = Math.floor(totalPoints / 50) + (examsCompleted >= 3 ? 1 : 0);

        // Fetch streak from user document
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        const streak = userData.streak?.current || 0;

        setStats({ totalPoints, examsCompleted, badges, streak });
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    };
    fetchUserProgress();
  }, [currentUser]);

  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.1 }
    );

    revealRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      revealRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [loading]);

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.year.toString().includes(searchTerm) ||
      (exam.title && exam.title.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesTag = true;
    if (activeTag === 'Recent') {
      matchesTag = exam.year >= 2020;
    } else if (activeTag === 'Classic') {
      matchesTag = exam.year < 2020 && exam.year >= 2010;
    } else if (activeTag === 'Archive') {
      matchesTag = exam.year < 2010;
    }

    return matchesSearch && matchesTag;
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const SkeletonCard = () => (
    <div className="bg-white rounded-[40px] p-10 border border-slate-100 overflow-hidden">
      <div className="flex justify-between items-start mb-12">
        <div className="w-20 h-20 skeleton rounded-3xl" />
        <div className="flex flex-col items-end gap-2">
          <div className="w-16 h-3 skeleton rounded" />
          <div className="w-24 h-4 skeleton rounded" />
        </div>
      </div>
      <div className="mb-12 space-y-4">
        <div className="w-3/4 h-10 skeleton rounded-xl" />
        <div className="flex gap-4">
          <div className="w-24 h-4 skeleton rounded" />
          <div className="w-20 h-4 skeleton rounded" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="w-full h-16 skeleton rounded-[24px]" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-14 skeleton rounded-[20px]" />
          <div className="h-14 skeleton rounded-[20px]" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 italic-none">
      {/* Dynamic Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-100 py-4 shadow-sm' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-100 shadow-xl group-hover:scale-105 transition-transform">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900">
                AMC8 <span className="text-indigo-600 font-bold">GUIDED</span>
              </span>
            </div>

            <div className="flex items-center gap-6">
              {currentUser ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student</span>
                    <span className="text-sm font-bold text-slate-700">{currentUser.displayName?.split(' ')[0] || 'Member'}</span>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <BookOpen className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-slate-900 px-5 py-2 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                >
                  Join the Mission <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="pt-40 pb-16 text-center max-w-4xl mx-auto reveal" ref={el => revealRefs.current[0] = el}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-8 animation-delay-300">
            <Rocket className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Next-Gen AMC Prep</span>
          </div>
          <h1 className="text-6xl sm:text-8xl font-black text-slate-900 tracking-tight leading-[0.85] mb-8">
            Master the Competition <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">
              with Clarity.
            </span>
          </h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed mb-12 max-w-2xl mx-auto">
            Experience individualized learning with AI-driven hints, official mock exams,
            and deep pattern analysis for every AMC 8 problem.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => document.getElementById('exams-grid').scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl hover:bg-slate-800 transition-all hover:translate-y-[-2px] active:translate-y-0"
            >
              Start Practicing
            </button>
          </div>

          {/* Gamification Stats Bar */}
          {currentUser && (
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { label: 'Total Points', value: stats.totalPoints, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: 'Exams Taken', value: stats.examsCompleted, icon: Trophy, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Streak', value: `${stats.streak} Day${stats.streak !== 1 ? 's' : ''}`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'Badges', value: stats.badges, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center p-4 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-2`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="text-xl font-black text-slate-900">{item.value}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Feature Pillars */}
        <section className="py-16 border-y border-slate-100 reveal" ref={el => revealRefs.current[1] = el}>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="p-8 rounded-[32px] bg-slate-50/50 hover:bg-slate-50 transition-colors group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-8 group-hover:scale-110 transition-transform">
                <Binary className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">Official Problem Bank</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Access every official AMC 8 problem from the last two decades, curated and updated for the modern student.
              </p>
            </div>
            <div className="p-8 rounded-[32px] bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-105 group relative overflow-hidden">
              <div className="absolute inset-0 shimmer opacity-10 pointer-events-none"></div>
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-black mb-4">AI-Guided Solutions</h3>
              <p className="text-indigo-100 font-medium leading-relaxed">
                Don't just see the answer. Get adaptive hints that guide your thinking process without spoiling the solution.
              </p>
            </div>
            <div className="p-8 rounded-[32px] bg-slate-50/50 hover:bg-slate-50 transition-colors group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-8 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">Performance Analytics</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Identify your weaknesses in Number Theory, Geometry, and Counting. Track your progress year-over-year.
              </p>
            </div>
          </div>
        </section>

        {/* Exam Vault */}
        <section id="exams-grid" className="pb-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 reveal" ref={el => revealRefs.current[2] = el}>
            <div className="flex-1">
              <h2 className="text-5xl font-black text-slate-900 tracking-tight">The Exam Vault</h2>
              <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-sm">Choose Your Challenge</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              {/* Search Bar */}
              <div className="relative group flex-1 sm:min-w-[300px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by year..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all shadow-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Tags/Filters */}
              <div className="flex gap-2 p-1 bg-slate-50 border border-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
                {['All', 'Recent', 'Classic', 'Archive'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    className={`px-5 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTag === tag
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    {tag === 'Recent' ? '2020+' : tag === 'Classic' ? '2010s' : tag === 'Archive' ? 'Pre-2010' : tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Count */}
          {!loading && (searchTerm || activeTag !== 'All') && (
            <div className="mb-8 flex items-center gap-4">
              <span className="text-sm font-bold text-slate-500">
                {filteredExams.length} {filteredExams.length === 1 ? 'exam' : 'exams'} found
              </span>
              {(searchTerm || activeTag !== 'All') && (
                <button
                  onClick={() => { setSearchTerm(''); setActiveTag('All'); }}
                  className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)
            ) : (
              filteredExams.map((exam) => (
                <div
                  key={exam.id}
                  className="group relative bg-white rounded-[40px] p-10 border border-slate-100 hover:border-indigo-100 transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(79,70,229,0.1)] active:scale-[0.99] overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-12">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors duration-500 relative">
                      <span className="text-slate-900 text-3xl font-black group-hover:text-indigo-600 transition-colors">
                        {exam.year.toString().slice(-2)}
                      </span>
                      {results[exam.year] && (
                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-white flex items-center justify-center text-[12px] font-black text-white shadow-lg animate-bounce">
                          {results[exam.year].score}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard</span>
                      <span className="text-sm font-bold text-slate-900">{exam.totalProblems || 25} Problems</span>
                    </div>
                  </div>

                  <div className="mb-12">
                    <h3 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">
                      AMC 8 {exam.year}
                    </h3>
                    <div className="flex items-center gap-6">
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Clock className="w-4 h-4" /> 40 Minutes
                      </span>
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Trophy className="w-4 h-4" /> Official
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {currentUser && (
                      <div className="mt-8">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</span>
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                            {results[exam.year] ? `${Math.round((results[exam.year].score / 25) * 100)}%` : 'Not Started'}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
                            style={{ width: results[exam.year] ? `${(results[exam.year].score / 25) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => navigate(`/guided/${exam.year}`)}
                      className="w-full bg-indigo-600 text-white font-black py-5 px-6 rounded-[24px] hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-100"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>GUIDED PRACTICE</span>
                    </button>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => navigate(`/practice/${exam.year}`)}
                        className="bg-slate-50 text-slate-900 font-extrabold py-4 px-4 rounded-[20px] hover:bg-slate-100 transition-all"
                      >
                        Classic
                      </button>
                      <button
                        onClick={() => navigate(`/test/${exam.year}`)}
                        className="bg-slate-50 text-slate-900 font-extrabold py-4 px-4 rounded-[20px] hover:bg-slate-100 transition-all"
                      >
                        Mock Test
                      </button>
                    </div>
                  </div>

                  {/* Subtle Year Watermark */}
                  <div className="absolute -bottom-10 -right-4 text-[120px] font-black text-slate-50 select-none group-hover:text-slate-100 transition-colors pointer-events-none -z-10">
                    {exam.year}
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && filteredExams.length === 0 && (
            <div className="text-center py-32 bg-slate-50 rounded-[48px] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-2xl font-black text-slate-900">No Matches Found</p>
              <p className="text-slate-500 font-medium mt-2">Try adjusting your search or filters.</p>
              <button
                onClick={() => { setSearchTerm(''); setActiveTag('All'); }}
                className="mt-8 text-indigo-600 font-black flex items-center gap-2 mx-auto hover:gap-3 transition-all"
              >
                Clear all filters <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="py-24 border-t border-slate-100 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white w-4 h-4" />
          </div>
          <span className="text-lg font-black tracking-tighter text-slate-900">
            AMC8 <span className="text-indigo-600">GUIDED</span>
          </span>
        </div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
          &copy; 2025 AMC 8 Guided. Built for Excellence.
        </p>
      </footer>
    </div>
  );
};

export default ExamSelection;
