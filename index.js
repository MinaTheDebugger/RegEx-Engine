{\rtf1\ansi\ansicpg1252\cocoartf2578
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fmodern\fcharset0 Courier;}
{\colortbl;\red255\green255\blue255;\red0\green0\blue0;}
{\*\expandedcolortbl;;\cssrgb\c0\c0\c0;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\deftab720
\pard\pardeftab720\partightenfactor0

\f0\fs24 \cf2 \expnd0\expndtw0\kerning0
\outl0\strokewidth0 \strokec2 class RegexpNode \{\
    derive (char) \{\
        return NeverMatches;\
    \}\
    matchEnd() \{ return false; \}\
    canMatchMore() \{ return !this.matchEnd(); \}\
\}\
\
class _EmptyString extends RegexpNode \{\
    matchEnd() \{ return true; \}\
\}\
const EmptyString = new _EmptyString();\
const NeverMatches = new RegexpNode();\
\
class CharacterNode extends RegexpNode \{\
    constructor (char, next) \{\
        super();\
        this.char = char;\
        this.next = next;\
    \}\
\
    derive (char) \{\
        if (char === this.char) \{\
            return this.next;\
        \} else \{\
            return NeverMatches;\
        \}\
    \}\
\}\
\
class AnyCharacterNode extends RegexpNode \{\
    constructor (next) \{\
        super();\
        this.next = next;\
    \}\
\
    derive (char) \{ return this.next; \}\
\}\
\
class AlternationNode extends RegexpNode \{\
    constructor (alternatives) \{\
        super();\
        let _alternatives = alternatives.filter((alt) => alt !== NeverMatches);\
        if (_alternatives.length === 0) \{\
            return NeverMatches;\
        \} else if (_alternatives.length === 1) \{\
            return _alternatives[0];\
        \} else \{\
            this.alternatives = _alternatives;\
        \}\
        return this;\
    \}\
    \
    derive (char) \{\
        return new AlternationNode(this.alternatives.map((alt) => alt.derive(char)));\
    \}\
\
    matchEnd() \{ return this.alternatives.some((alt) => alt.matchEnd()); \}\
    canMatchMore() \{ return this.alternatives.some((alt) => alt.canMatchMore()); \}\
\}\
\
class RepetitionNode extends RegexpNode \{\
    constructor (next) \{\
        super();\
        // head will be set properly later by modification\
        this.head = NeverMatches;\
        this.next = next;\
    \}\
\
    derive (char) \{\
        return new AlternationNode([\
            this.head.derive(char),\
            this.next.derive(char),\
        ]);\
    \}\
\
    matchEnd() \{ return this.next.matchEnd(); \}\
    canMatchMore() \{ return true; \}\
\}\
\
class _Or \{\
    constructor (alternatives) \{\
        this.alternatives = alternatives;\
    \}\
\}\
function Or(alternatives) \{\
    if (!(alternatives instanceof Array)) \{\
        throw new TypeError("alternatives passed to Or must be an Array");\
    \} else \{\
        return new _Or(alternatives);\
    \}\
\}\
\
class _ZeroOrMore \{\
    constructor (repeatable) \{\
        this.repeatable = repeatable;\
    \}\
\}\
function ZeroOrMore(repeatable) \{\
    return new _ZeroOrMore(repeatable);\
\}\
\
const Any = Symbol('Any');\
\
function compileString(str, tail=EmptyString) \{\
    // the following is, as far as I can tell, the only way to reverse the codepoints of a string in JavaScript\
    let reversedStr = Array.from(str).reverse();\
    for (let char of reversedStr) \{\
        tail = new CharacterNode(char, tail);\
    \}\
    return tail;\
\}\
\
function compileArray(arr, tail=EmptyString) \{\
    for (let expr of arr.reverse()) \{\
        tail = compile(expr, tail);\
    \}\
    return tail;\
\}\
\
function compileOr(or, tail=EmptyString) \{\
    return new AlternationNode(or.alternatives.map((alternative) => compile(alternative, tail)));\
\}\
\
function compileZeroOrMore(zeroOrMore, tail=EmptyString) \{\
    let repetition = new RepetitionNode(tail),\
        contents = compile(zeroOrMore.repeatable, repetition);\
    repetition.head = contents;\
    return repetition;\
\}\
\
function compileAny(tail=EmptyString) \{\
    return new AnyCharacterNode(tail);\
\}\
\
function compile(expr, tail=EmptyString) \{\
    if ((typeof expr) === 'string') \{\
        return compileString(expr, tail);\
    \} else if (expr instanceof Array) \{\
        return compileArray(expr, tail);\
    \} else if (expr instanceof _Or) \{\
        return compileOr(expr, tail);\
    \} else if (expr instanceof _ZeroOrMore) \{\
        return compileZeroOrMore(expr, tail);\
    \} else if (expr === Any) \{\
        return compileAny(tail);\
    \} else \{\
        throw new TypeError("tried to compile something that's not a valid regexp datum");\
    \}\
\}\
\
class RE \{\
    constructor (regexp) \{\
        this.start = compile(regexp);\
    \}\
\
    match (str) \{\
        let state = this.start,\
            chars = Array.from(str);\
        if ((chars.length === 0) && state.matchEnd()) \{ return true; \}\
        for (let i = 0; i < chars.length; i++) \{\
            let char = chars[i];\
            state = state.derive(char);\
            if (state.matchEnd() && (i === (chars.length - 1))) \{\
                // end of the regexp and of the string, successful match\
                return true;\
            \} else if (state.matchEnd() && !state.canMatchMore()) \{\
                // end of the regexp but not of the string, doesn't match\
                return false;\
            \}\
        \}\
        // end of the string but not of the regexp, doesn't match\
        return false;\
    \}\
\}\
}