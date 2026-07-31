import { Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PLAYER_THEMES } from '@/config/playerThemes';
import { useActivePlayerThemeId, useSetPlayerTheme } from '@/hooks/usePlayerTheme';

/** Lets the admin pick the site-wide turntable look & feel. */
const PlayerThemePicker = () => {
  const { data: activeThemeId, isLoading } = useActivePlayerThemeId();
  const setTheme = useSetPlayerTheme();

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Look &amp; Feel</CardTitle>
        <CardDescription>
          Choose the turntable style for your site. The palette updates to match, and visitors
          see the change straight away.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading styles...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {PLAYER_THEMES.map((theme) => {
              const isActive = theme.id === activeThemeId;
              const isPending = setTheme.isPending && setTheme.variables === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => !isActive && setTheme.mutate(theme.id)}
                  disabled={setTheme.isPending}
                  aria-pressed={isActive}
                  className={cn(
                    'group relative overflow-hidden rounded-lg border text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'border-primary ring-2 ring-primary/40'
                      : 'border-border hover:border-primary/60',
                    setTheme.isPending && !isPending && 'opacity-60'
                  )}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={theme.assets.thumb}
                      alt={`${theme.name} turntable style`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium">{theme.name}</p>
                    <p className="text-xs text-muted-foreground">{theme.description}</p>
                    <div className="mt-2 flex gap-1">
                      {['--background', '--card', '--primary', '--accent'].map((token) => (
                        <span
                          key={token}
                          className="h-4 w-4 rounded-full border border-border"
                          style={{ backgroundColor: `hsl(${theme.tokens[token]})` }}
                        />
                      ))}
                    </div>
                  </div>
                  {isActive && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                      <Check className="h-3 w-3" />
                      Active
                    </span>
                  )}
                  {isPending && (
                    <span className="absolute right-2 top-2 rounded-md bg-secondary p-1 text-secondary-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerThemePicker;