#!/usr/bin/env node
const yargs = require('yargs')
	.usage(`
Usage: $0 [-e eye_string] [-f cowfile] [-h] [-l] [-n] [-T tongue_string] [-W column] [-bdgpstwy] text
		
If any command-line arguments are left over after all switches have been processed, they become the cow's message.
		
If the program is invoked as cowthink then the cow will think its message instead of saying it.
`)
  .options({
    e: {
      default: 'oo',
      // FIX #3: Added eyes validation to ensure proper ASCII art formatting
      coerce: (val) => {
        if (typeof val !== 'string' || val.length !== 2) {
          throw new Error('Eyes must be exactly 2 characters (e.g., "oo", "^^", "xx")');
        }
        return val;
      },
    },
    T: {
      default: '  ',
      // FIX #4: Added tongue validation to ensure proper ASCII art formatting
      coerce: (val) => {
        if (typeof val !== 'string' || val.length !== 2) {
          throw new Error('Tongue must be exactly 2 characters (e.g., "  ", "U ")');
        }
        return val;
      },
    },
    W: {
      default: 40,
      type: 'number',
      // FIX #2: Added width validation to prevent crashes
      coerce: (val) => {
        if (typeof val !== 'number' || isNaN(val)) {
          throw new Error('Width must be a valid number');
        }
        if (val < 1) {
          throw new Error('Width must be at least 1');
        }
        if (val > 1000) {
          throw new Error('Width too large (max 1000)');
        }
        return val;
      },
    },
    f: {
      default: 'default',
      // FIX #5: Added cow file validation to prevent crashes and help users with typos
      describe: 'Cow file to use. Use -l to list all available cows.',
      coerce: (cowName) => {
        try {
          // Access listSync directly from the cows module
          const cows = require('./lib/cows');
          const availableCows = cows.listSync();
          
          // Check if the cow exists in the list
          if (!availableCows.includes(cowName)) {
            // Try to find a similar cow name (starts with same letters)
            const suggestion = availableCows.find(cow => 
              cow.toLowerCase().startsWith(cowName.toLowerCase())
            );
            
            let errorMsg = `Cow "${cowName}" not found.`;
            if (suggestion) {
              errorMsg += ` Did you mean "${suggestion}"?`;
            }
            errorMsg += '\nUse -l to list all available cows.';
            
            throw new Error(errorMsg);
          }
          
          return cowName;
        } catch (err) {
          // If error message is about cow not found, re-throw it
          if (err.message.includes('not found')) {
            throw err;
          }
          // For other errors (like listSync failing), just return the cow name
          // and let it fail later with a more specific error
          return cowName;
        }
      },
    },
    think: {
      type: 'boolean',
    },
  })
  .describe({
    b: 'Mode: Borg',
    d: 'Mode: Dead',
    g: 'Mode: Greedy',
    p: 'Mode: Paranoia',
    s: 'Mode: Stoned',
    t: 'Mode: Tired',
    w: 'Mode: Wired',
    y: 'Mode: Youthful',
    e: "Select the appearance of the cow's eyes.",
    T:
      'The tongue is configurable similarly to the eyes through -T and tongue_string.',
    h: 'Display this help message',
    n: 'If it is specified, the given message will not be word-wrapped.',
    W:
      'Specifies roughly where the message should be wrapped. The default is equivalent to -W 40 i.e. wrap words at or before the 40th column.',
    f:
      "Specifies a cow picture file (''cowfile'') to use. It can be either a path to a cow file or the name of one of cows included in the package.",
    r: 'Select a random cow',
    l: 'List all cowfiles included in this package.',
    think: 'Think the message instead of saying it aloud.',
  })
  .boolean(['b', 'd', 'g', 'p', 's', 't', 'w', 'y', 'n', 'h', 'r', 'l'])
  .help()
  .alias('h', 'help');

const argv = yargs.argv;

if (argv.l) {
  listCows();
} else if (argv._.length) {
  say();
} else {
  // FIX #1: Added .catch() handler to prevent unhandled promise rejection
  require('get-stdin')().then((data) => {
    if (data) {
      argv._ = [require('strip-final-newline')(data)];
      say();
    } else {
      yargs.showHelp();
    }
  }).catch((err) => {
    // Handle any errors from reading stdin gracefully
    console.error('Error reading stdin:', err.message);
    process.exit(1);
  });
}

function say() {
  // POTENTIAL CRASH ISSUE #3: No error handling
  // If require('./index') fails (missing file, syntax error), this will crash.
  // If module.say() or module.think() throw an error (invalid cow file, 
  // malformed input), the error will be uncaught and crash the process.
  const module = require('./index');
  const think = /think$/.test(argv['$0']) || argv.think;

  // CRASH ISSUE #4: No input validation
  // If argv.text is undefined and argv._ is also undefined/empty, 
  // index.js will try to call .join() on undefined, causing:
  // TypeError: Cannot read property 'join' of undefined
  console.log(think ? module.think(argv) : module.say(argv));
}

function listCows() {
  require('./index').list((err, list) => {
    // FIX #6: Proper error handling for listCows
    if (err) {
      console.error('Error listing cows:', err.message || err);
      process.exit(1);
    }
    
    // Validate that list is an array before using it
    if (!list || !Array.isArray(list)) {
      console.error('Error: Could not retrieve cow list');
      process.exit(1);
    }
    
    console.log(list.join('  '));
    process.exit(0);
  });
}
