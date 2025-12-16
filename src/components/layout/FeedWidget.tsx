import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FeedList from '@/features/social/views/FeedList';
import PostButton from '@/features/social/components/PostButton';
import { MessagesSquare, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function useUrlQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function FeedWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const urlQuery = useUrlQuery();
  const sortBy = (urlQuery.get('sortBy') as 'hot' | 'latest') || 'hot';
  const popularWindow = (urlQuery.get('window') as '24h' | '7d' | '30d' | 'all') || '24h';

  const handleSortChange = (newSort: 'hot' | 'latest') => {
    const params = new URLSearchParams(location.search);
    params.set('sortBy', newSort);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const handlePopularWindowChange = (window: '24h' | '7d' | '30d' | 'all') => {
    const params = new URLSearchParams(location.search);
    params.set('window', window);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const getMobileTitle = () => {
    if (sortBy === "latest") {
      return "Latest";
    }
    const timeLabel = popularWindow === '24h' ? 'Today' : popularWindow === '7d' ? 'This week' : 'All time';
    return `Hot ${timeLabel.toLowerCase()}`;
  };

  const handleMobileOptionSelect = (option: string) => {
    const params = new URLSearchParams(location.search);
    
    if (option === "latest") {
      params.set('sortBy', 'latest');
    } else if (option === "this-week") {
      params.set('sortBy', 'hot');
      params.set('window', '7d');
    } else if (option === "all-time") {
      params.set('sortBy', 'hot');
      params.set('window', 'all');
    } else if (option === "today") {
      params.set('sortBy', 'hot');
      params.set('window', '24h');
    }
    
    // Update URL in a single navigation call
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  return (
    <div className="h-fit min-w-0">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <MessagesSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Feed</h1>
              <p className="text-xs text-white/60">Latest posts and updates</p>
            </div>
          </div>
          
          {/* Sort Dropdown */}
          <div className="hidden md:flex items-center h-[52px] justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm font-semibold text-white tracking-tight [text-shadow:none] [background:none] [-webkit-text-fill-color:white] hover:opacity-80 transition-opacity focus:outline-none">
                  <span>{getMobileTitle()}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-white/70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                sideOffset={8}
                className="bg-white/5 backdrop-blur-xl border-white/20 text-white min-w-[240px] py-2 rounded-xl shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-4 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-top"
                style={{
                  background: "radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.06), transparent 40%), rgba(255, 255, 255, 0.03)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                }}
              >
                {sortBy === "hot" ? (
                  <>
                    {popularWindow !== "24h" && (
                      <DropdownMenuItem
                        onClick={() => handleMobileOptionSelect("today")}
                        className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                      >
                        Today
                      </DropdownMenuItem>
                    )}
                    {popularWindow !== "7d" && (
                      <DropdownMenuItem
                        onClick={() => handleMobileOptionSelect("this-week")}
                        className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                      >
                        This week
                      </DropdownMenuItem>
                    )}
                    {popularWindow !== "all" && (
                      <DropdownMenuItem
                        onClick={() => handleMobileOptionSelect("all-time")}
                        className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                      >
                        All time
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect("latest")}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      Latest
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect("today")}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      Popular today
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect("this-week")}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      Hot this week
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect("all-time")}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      Popular all time
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Post Button */}
      <div className="mb-4">
        <PostButton compact={true} />
      </div>

      {/* Use FeedList with standalone=false to get just the feed content */}
      <div className="[&_>_div]:!w-full [&_>_div]:!max-w-none">
        <FeedList 
          standalone={false} 
          compact={true} 
          hidePostButton={true}
          hideSortControls={true}
        />
      </div>
    </div>
  );
}
