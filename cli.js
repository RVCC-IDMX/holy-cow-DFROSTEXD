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
      // CRASH ISSUE #8: No validation on eyes
      // Users can pass ANY string (e.g., -e "TOOLONG" or -e ""). Eyes should be
      // exactly 2 characters or the ASCII art will be misaligned/broken.
    },
    T: {
      default: '  ',
      // CRASH ISSUE #9: No validation on tongue
      // Same as eyes - tongue must be exactly 2 characters or output breaks.
    },
    W: {
      default: 40,
      type: 'number',
      // CRASH ISSUE #10: No validation on width
      // Users can pass: -W -10 (negative), -W 0 (zero), -W abc (NaN)
      // This will cause the word-wrap logic to fail or create infinite loops.
      // Test: cowsay -W 0 "test" or cowsay -W -5 "test"
    },
    f: {
      default: 'default',
      // CRASH ISSUE #11: No validation that cow file exists
      // If user passes -f nonexistentcow, the app will crash when trying to
      // load the cow file. Should validate and show available cows.
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
  // CRASH ISSUE #1: Unhandled Promise Rejection
  // This promise has no .catch() handler. If get-stdin rejects (e.g., read error,
  // permission denied, stdin closed unexpectedly), it will cause an unhandled 
  // promise rejection warning and crash the process in Node.js strict mode or
  // future versions. This is a critical production bug.
  require('get-stdin')().then((data) => {
    if (data) {
      // CRASH ISSUE #2: Mutating argv object
      // Directly mutating argv._ can cause unexpected behavior since yargs expects
      // this to be immutable parsed arguments. While not an immediate crash, this
      // is an anti-pattern that can lead to bugs if argv is accessed elsewhere.
      argv._ = [require('strip-final-newline')(data)];
      say();
    } else {
      yargs.showHelp();
    }
  });
  // MISSING: .catch((err) => { console.error(err); process.exit(1); })
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
    // CRASH ISSUE #5: Throwing in async callback
    // This throw happens inside a callback, so it won't be caught by try-catch
    // in the outer scope. This creates an uncaught exception that crashes Node.js.
    // Additionally, if 'err' is already an Error object, wrapping it in 
    // new Error(err) creates a confusing error message like "Error: Error: message"
    if (err) throw new Error(err);
    
    // POTENTIAL CRASH ISSUE #6: list might be undefined
    // If the callback is called with (null, undefined) instead of (null, []),
    // calling .join() on undefined will crash with:
    // TypeError: Cannot read property 'join' of undefined
    console.log(list.join('  '));
  });
  
  // CRASH ISSUE #7: No error exit code
  // Even if the error is somehow handled, the process doesn't exit with code 1,
  // so scripts using this CLI won't know an error occurred.
}
