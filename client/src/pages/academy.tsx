import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Video, FileText, Users } from "lucide-react";

export default function Academy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" data-testid="link-home">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              BESTIR ACADEMY
            </h1>
            <div></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Learn Investor Relations
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Master the art of investor relations with our comprehensive learning platform. 
            From basic concepts to advanced strategies, we've got you covered.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border" data-testid="card-courses">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mb-4">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Courses
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Structured learning paths covering all aspects of investor relations
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border" data-testid="card-videos">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mb-4">
              <Video className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Video Tutorials
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Watch expert practitioners share their insights and best practices
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border" data-testid="card-resources">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg mb-4">
              <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Resources
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Templates, guides, and tools to support your IR activities
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border" data-testid="card-community">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg mb-4">
              <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Community
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Connect with other IR professionals and share experiences
            </p>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm border">
          <div className="max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Coming Soon
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We're working hard to bring you the best learning experience. 
              BESTIR ACADEMY will launch soon with comprehensive IR training programs.
            </p>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email for updates"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                data-testid="input-email"
              />
              <Button 
                className="w-full" 
                size="lg"
                data-testid="button-notify"
              >
                Notify Me When Available
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}