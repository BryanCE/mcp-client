# MCP Client - UI Specification

## Design System Overview

### Theme Integration
- **Base Theme**: Dracula color palette from globals.css
- **Theme Management**: Next-themes for seamless light/dark mode switching
- **Component Library**: shadcn/ui components with Dracula theme customization
- **Custom Classes**: Only use card-square and card-rounded for special styling needs
- **Responsive Design**: Mobile-first approach with desktop optimization

### Color Palette
```css
/* Light Mode */
--primary: #bd93f9 (Purple)
--accent: #8be9fd (Cyan)
--secondary: #44475a (Dark Gray)
--destructive: #ff5555 (Red)
--background: #f8f8f2 (Light Cream)

/* Dark Mode */
--primary: #bd93f9 (Purple)
--accent: #83c7d6 (Muted Cyan)
--secondary: #6272a4 (Blue Gray)
--background: #282a36 (Dark Blue)
```

## Layout Structure

### Root Layout
```
┌─────────────────────────────────────────────────────────────┐
│                      Header (64px)                          │
│  [Logo] [Theme Toggle] [Status Indicators]   [User Actions] │
├─────────┬─────────────────────────────┬─────────────────────┤
│         │                             │                     │
│  Left   │        Center Chat          │   Right Panel      │
│  Nav    │                             │                     │
│ (280px) │                             │     (320px)        │
│         │                             │                     │
│         │                             │                     │
└─────────┴─────────────────────────────┴─────────────────────┘
```

## Component Specifications

### Header Component (shadcn components)
**Location**: `src/components/layout/Header.tsx`

#### shadcn Components Used
- `Button` - Theme toggle, settings, help buttons
- `Badge` - Connection status indicators
- `DropdownMenu` - User actions menu
- `Separator` - Visual separators

#### Elements
- **Logo Area**: MCP Client branding with icon
- **Theme Toggle**: `Button` with theme icon from lucide-react
- **Status Indicators**: 
  - MCP Server connection count (`Badge` with variant="outline")
  - AI Provider status (`Badge` with variant="secondary")
- **User Actions**: `DropdownMenu` with settings, help options

#### Implementation
```typescript
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Moon, Sun, Settings, HelpCircle } from "lucide-react"

className="h-16 border-b bg-background px-6 flex items-center justify-between"
```

### Left Navigation Panel (shadcn Sidebar/Accordion)
**Location**: `src/components/layout/LeftNav.tsx`

#### shadcn Components Used
- `ResizablePanel` - For resizable sidebar
- `Accordion` - Collapsible navigation sections
- `Button` - Add buttons and navigation items
- `Badge` - Status indicators
- `ScrollArea` - Scrollable content
- `Separator` - Section dividers

#### Navigation Structure with shadcn
```tsx
<ScrollArea className="flex-1">
  <Accordion type="multiple" defaultValue={["mcp", "ai", "settings"]}>
    <AccordionItem value="mcp">
      <AccordionTrigger>📁 MCP Servers</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start">
            <Badge variant="default" className="mr-2">●</Badge>
            noaa-free (Connected)
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Badge variant="destructive" className="mr-2">●</Badge>
            weather-api (Disconnected)
          </Button>
          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add MCP Server
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
    
    <AccordionItem value="ai">
      <AccordionTrigger>🤖 AI Providers</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start">
            <Badge variant="default" className="mr-2">●</Badge>
            OpenAI (GPT-4)
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Badge variant="secondary" className="mr-2">●</Badge>
            Anthropic (Rate Limited)
          </Button>
          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</ScrollArea>
```

#### Styling
```typescript
// Using ResizablePanel instead of fixed width
<ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
  <div className="border-r bg-muted/10 overflow-y-auto">
```

### Center Chat Interface (shadcn components)
**Location**: `src/components/chat/ChatInterface.tsx`

#### shadcn Components Used
- `Card` - Provider indicator and message containers
- `Select` - Provider and model selection
- `ScrollArea` - Message area scrolling
- `Textarea` - Message input
- `Button` - Send button and actions
- `Badge` - Tool usage indicators
- `Skeleton` - Loading states
- `Alert` - Error messages

#### Layout Structure with shadcn
```tsx
<div className="flex flex-col h-full">
  {/* Provider Indicator */}
  <Card className="m-4 mb-2">
    <CardContent className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-2">
        <Bot className="h-5 w-5" />
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select AI Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI GPT-4</SelectItem>
            <SelectItem value="anthropic">Anthropic Claude</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Badge variant="outline">{connectionStatus}</Badge>
    </CardContent>
  </Card>

  {/* Messages Area */}
  <ScrollArea className="flex-1 px-4">
    <div className="space-y-4">
      {/* User Message */}
      <div className="flex justify-end">
        <Card className="max-w-[80%] bg-primary text-primary-foreground">
          <CardContent className="p-3">
            <p>{message.content}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* AI Message */}
      <div className="flex justify-start">
        <Card className="max-w-[80%]">
          <CardContent className="p-3">
            <p>{message.content}</p>
            {message.toolCalls && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.toolCalls.map(tool => (
                  <Badge key={tool.id} variant="secondary" className="text-xs">
                    {tool.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </ScrollArea>

  {/* Input Area */}
  <Card className="m-4 mt-2">
    <CardContent className="p-4">
      <div className="flex space-x-2">
        <Textarea
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 min-h-[40px] resize-none"
          onKeyDown={handleKeyDown}
        />
        <Button 
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          size="icon"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4 mr-1" />
            Attach
          </Button>
          <Button variant="ghost" size="sm">
            <Wrench className="h-4 w-4 mr-1" />
            MCP Tools
          </Button>
        </div>
        <span>Ctrl+Enter to send</span>
      </div>
    </CardContent>
  </Card>
</div>
```

### Right Information Panel (shadcn Tabs)
**Location**: `src/components/info/InfoPanel.tsx`

#### shadcn Components Used
- `ResizablePanel` - Resizable right panel
- `Tabs` - Tab navigation
- `Card` - Information cards
- `ScrollArea` - Scrollable content
- `Badge` - Status indicators
- `Progress` - Performance metrics
- `Alert` - Error messages
- `Collapsible` - Expandable sections

#### Tab Structure with shadcn
```tsx
<ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
  <div className="border-l bg-muted/10 h-full">
    <Tabs defaultValue="tools" className="h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
        <TabsTrigger value="tools">
          <Wrench className="h-4 w-4 mr-1" />
          Tools
        </TabsTrigger>
        <TabsTrigger value="usage">
          <BarChart3 className="h-4 w-4 mr-1" />
          Usage
        </TabsTrigger>
        <TabsTrigger value="debug">
          <Bug className="h-4 w-4 mr-1" />
          Debug
        </TabsTrigger>
        <TabsTrigger value="performance">
          <Zap className="h-4 w-4 mr-1" />
          Perf
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tools" className="flex-1 px-4">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {/* Active Tool Calls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Tool Calls</CardTitle>
              </CardHeader>
              <CardContent>
                {activeToolCalls.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No active tool calls</p>
                ) : (
                  <div className="space-y-2">
                    {activeToolCalls.map(tool => (
                      <div key={tool.id} className="flex items-center justify-between">
                        <Badge variant="outline">{tool.name}</Badge>
                        <Progress value={tool.progress} className="w-16 h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tool History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Tool Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {toolHistory.map(tool => (
                    <Collapsible key={tool.id}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant={tool.success ? "default" : "destructive"} className="text-xs">
                            {tool.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {tool.duration}ms
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-2 text-xs">
                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(tool.parameters, null, 2)}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="usage" className="flex-1 px-4">
        <ScrollArea className="h-full">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tool Calls Today</span>
                  <Badge variant="outline">42</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Success Rate</span>
                  <Badge variant="default">94%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Response Time</span>
                  <Badge variant="secondary">1.2s</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="debug" className="flex-1 px-4">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {debugLogs.map(log => (
              <Alert key={log.id} variant={log.level === 'error' ? 'destructive' : 'default'}>
                <AlertDescription className="text-xs font-mono">
                  [{log.timestamp}] {log.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  </div>
</ResizablePanel>
```

## Modal Components (shadcn Dialog)

### MCP Server Configuration Modal
**Location**: `src/components/modals/MCPServerModal.tsx`

#### shadcn Components Used
- `Dialog` - Modal container
- `Form` - Form handling with react-hook-form
- `Input` - Text inputs
- `Label` - Form labels
- `Button` - Action buttons
- `Select` - Dropdown selections
- `Badge` - Tag inputs for arrays
- `Alert` - Validation messages

#### Implementation
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Configure MCP Server</DialogTitle>
      <DialogDescription>
        Add a new MCP server connection to your workspace.
      </DialogDescription>
    </DialogHeader>
    
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Server Name</FormLabel>
              <FormControl>
                <Input placeholder="weather-server" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="command"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Command/Package</FormLabel>
              <FormControl>
                <Input placeholder="@modelcontextprotocol/server-weather" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="local">Local Process</SelectItem>
                  <SelectItem value="remote">Remote Server</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Server
          </Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

### AI Provider Configuration Modal
**Location**: `src/components/modals/AIProviderModal.tsx`

#### shadcn Components Used
- `Dialog` - Modal container
- `Form` - Form handling
- `Input` - Text and password inputs
- `Select` - Provider and model selection
- `Alert` - Security warnings
- `Button` - Action buttons

#### Provider-Specific Forms with shadcn
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Configure AI Provider</DialogTitle>
    </DialogHeader>
    
    <Alert className="mb-4">
      <Shield className="h-4 w-4" />
      <AlertTitle>Security Notice</AlertTitle>
      <AlertDescription>
        API keys are stored in memory only and never persisted to disk.
      </AlertDescription>
    </Alert>
    
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provider</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="apiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="sk-..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={testConnection}>
            Test Connection
          </Button>
          <Button type="submit">Save Provider</Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

## Responsive Design (shadcn responsive utilities)

### Breakpoints with shadcn
```tsx
// Mobile: < 768px
<div className="flex flex-col md:hidden">
  <MobileBottomNav />
</div>

// Tablet: 768px - 1024px  
<div className="hidden md:flex lg:hidden">
  <CompactLayout />
</div>

// Desktop: > 1024px
<div className="hidden lg:flex">
  <ResizablePanelGroup direction="horizontal">
    <ResizablePanel defaultSize={20}>
      <LeftNav />
    </ResizablePanel>
    <ResizableHandle />
    <ResizablePanel defaultSize={60}>
      <ChatInterface />
    </ResizablePanel>
    <ResizableHandle />
    <ResizablePanel defaultSize={20}>
      <RightPanel />
    </ResizablePanel>
  </ResizablePanelGroup>
</div>
```

### Mobile Adaptations with shadcn
- **Bottom Navigation**: `NavigationMenu` component at bottom
- **Sheet Component**: Slide-out panels using `Sheet`
- **Touch Optimization**: Larger touch targets with appropriate padding
- **Responsive Grids**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

## Accessibility Specifications

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 ratio for normal text
- **Keyboard Navigation**: Full app accessibility via keyboard
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators

### Keyboard Shortcuts
```
Ctrl + K: Command palette
Ctrl + Enter: Send message
Ctrl + /: Toggle shortcuts help
Ctrl + D: Toggle theme
Ctrl + 1-4: Switch between panels
Esc: Close modals/overlays
```

## Animation and Transitions

### Micro-interactions
- **Button Hover**: Subtle scale and color transitions
- **Card Hover**: Elevation shadow changes
- **Loading States**: Skeleton screens and spinners
- **Message Streaming**: Smooth text appearance

### Page Transitions
- **Panel Sliding**: Smooth panel show/hide animations
- **Modal Entrance**: Scale and fade animations
- **Theme Switching**: Smooth color transitions

## State Management

### UI State
- Navigation panel collapse states
- Modal open/close states
- Form input states and validation
- Theme preferences

### Real-time Updates
- MCP server connection status
- AI provider availability
- Tool call progress and results
- Chat message streaming

## Loading States (shadcn components)

### shadcn Loading Components
- `Skeleton` - For content placeholders
- `Spinner` from lucide-react - Loading indicators
- `Progress` - Progress bars for operations
- `Alert` with loading state - Status messages

#### Implementation Examples
```tsx
// Message loading state
<div className="flex justify-start">
  <Card className="max-w-[80%]">
    <CardContent className="p-3">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </CardContent>
  </Card>
</div>

// Connection status loading
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Connecting...
</Button>

// Tool execution progress
<div className="flex items-center space-x-2">
  <Progress value={progress} className="flex-1" />
  <span className="text-sm text-muted-foreground">{progress}%</span>
</div>
```

## Error Handling (shadcn Alert variants)

### Error Display with shadcn
```tsx
// Connection errors
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Connection Failed</AlertTitle>
  <AlertDescription>
    Unable to connect to MCP server. 
    <Button variant="link" className="p-0 h-auto">
      Retry connection
    </Button>
  </AlertDescription>
</Alert>

// API errors
<Alert variant="default">
  <Info className="h-4 w-4" />
  <AlertTitle>API Rate Limited</AlertTitle>
  <AlertDescription>
    You've reached the rate limit. Please wait before sending more messages.
  </AlertDescription>
</Alert>

// Validation errors (handled by Form components)
<FormField
  control={form.control}
  name="apiKey"
  render={({ field }) => (
    <FormItem>
      <FormLabel>API Key</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage /> {/* Shows validation errors */}
    </FormItem>
  )}
/>
```

## Animation and Transitions (built-in shadcn)

### shadcn Animation Classes
```tsx
// Button hover states (built-in)
<Button variant="default">Hover me</Button>

// Card hover effects
<Card className="transition-shadow hover:shadow-lg">
  <CardContent>Content</CardContent>
</Card>

// Modal animations (built-in to Dialog)
<Dialog>
  <DialogContent> {/* Automatic fade and scale animations */}
    Content
  </DialogContent>
</Dialog>

// Collapsible animations (built-in)
<Collapsible>
  <CollapsibleTrigger>Toggle</CollapsibleTrigger>
  <CollapsibleContent> {/* Smooth expand/collapse */}
    Content
  </CollapsibleContent>
</Collapsible>
```

## Required shadcn/ui Components List

### Core Components Needed
```bash
# Layout & Navigation
 accordion
bunx --bun shadcn@latest add resizable
bunx --bun shadcn@latest add accordion  
bunx --bun shadcn@latest add navigation-menu
bunx --bun shadcn@latest add sheet

# Data Display
bunx --bun shadcn@latest add card
bunx --bun shadcn@latest add badge
bunx --bun shadcn@latest add tabs
bunx --bun shadcn@latest add scroll-area
bunx --bun shadcn@latest add progress
bunx --bun shadcn@latest add skeleton

# Forms & Input
bunx --bun shadcn@latest add form
bunx --bun shadcn@latest add input
bunx --bun shadcn@latest add textarea
bunx --bun shadcn@latest add select
bunx --bun shadcn@latest add button
bunx --bun shadcn@latest add label

# Feedback
bunx --bun shadcn@latest add alert
bunx --bun shadcn@latest add dialog
bunx --bun shadcn@latest add dropdown-menu
bunx --bun shadcn@latest add tooltip

# Utility
bunx --bun shadcn@latest add separator
bunx --bun shadcn@latest add collapsible
```

## Custom Styling Integration

### Using Your Dracula Theme with shadcn
```tsx
// Only use your custom classes for special cases
<Card className="card-rounded"> {/* Your custom styling */}
  <CardContent>
    <Badge variant="outline">Standard shadcn Badge</Badge>
  </CardContent>
</Card>

// Theme integration in tailwind.config.ts
export default {
  // ... other config
  theme: {
    extend: {
      colors: {
        // shadcn color system uses CSS variables
        // Your globals.css already defines these correctly
        primary: "hsl(var(--primary))", // #bd93f9
        accent: "hsl(var(--accent))",   // #8be9fd
        // etc.
      }
    }
  }
}
```