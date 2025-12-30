import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ExamSelection from './components/ExamSelection';
import PracticeView from './components/PracticeView';
import TestView from './components/TestView';
import ResultsView from './components/ResultsView';
import GuidedPracticeView from './components/GuidedPracticeView';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TopicDrillView from './components/TopicDrillView';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ExamSelection />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/practice/:year" element={<PracticeView />} />
          <Route path="/practice/topic/:topicName" element={<TopicDrillView />} />
          <Route path="/test/:year" element={<TestView />} />
          <Route path="/results/:year" element={<ResultsView />} />
          <Route path="/guided/:year" element={<GuidedPracticeView />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
