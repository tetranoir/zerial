interface Object {
    entries: (obj: any) => (Array<[string, any]>);
}

function tuplize<T extends any[]& {'0': any}>(array: T): T {
    return array;
}

// F describes a single arity function
type F<T> = (a?: any) => T;

// O describes an object with 1 arity functions as values.
interface O<T> {
    [k: string]: F<T>;
}

// AR describes an array of functions' return type
type AR<T> = T extends Array<F<infer U>> ? U : never;

// R describes a the inferred return type of a function
type R<T> = T extends F<infer U> ? U : never;

// RR describes tupled return types (up to size 6)
// Non-recursive because TS does not support recursive very well and it gets messy real fast
type RR<T> = RR1<T>;
type RR1<T> = T extends [F<infer A1>] ? [A1] : RR2<T>;
type RR2<T> = T extends [F<infer A1>, F<infer A2>] ? [A1, A2] : RR3<T>;
type RR3<T> = T extends [F<infer A1>, F<infer A2>, F<infer A3>] ? [A1, A2, A3] : RR4<T>;
type RR4<T> = T extends [F<infer A1>, F<infer A2>, F<infer A3>, F<infer A4>] ? [A1, A2, A3, A4] : never;
type RR5<T> = T extends [F<infer A1>, F<infer A2>, F<infer A3>, F<infer A4>, F<infer A5>] ? [A1, A2, A3, A4, A5] : never;
type RR6<T> = T extends [F<infer A1>, F<infer A2>, F<infer A3>, F<infer A4>, F<infer A5>, F<infer A6>] ? [A1, A2, A3, A4, A5, A6] : never;

// EXPORT
// G describes the generic class that uses single arity functions as values
class G {
    [k: string]: F<any>;
}

// EXPORT
// RT describes an object whose values are the return types of values of T
type RT<T extends O<any>> = {
    [k in keyof T]: ReturnType<T[k]>;
};

// object keys
type OK<T> = T extends {} ? keyof T : never;

// LRT describes an object with specific keys whose values are the return types of values of T
type LRT2<T extends O<any>> = LRT_<T, OK<T>>;
type LRT_<T extends O<any>, U extends OK<T>> = {
    [k in U]: ReturnType<T[k]>;
};

type PrimativeStr = 'string' | 'number' | 'boolean';
const valAsType = <T>(typ: PrimativeStr) => (val: T) => {
    if (typeof val !== typ) {
        throw new Error(`Value ${val} is not a ${typ}`);
    }
    return val;
};
const StringVal = valAsType<string>('string');
const NumberVal = valAsType<number>('number');
const BooleanVal = valAsType<boolean>('boolean');

// Set as function so I can reflect the name
function string(val: string) {
    if (typeof val !== 'string') { throw new Error(`Value ${val} is not a string`); }
    return val;
}
function number(val: number) {
    if (typeof val !== 'number') { throw new Error(`Value ${val} is not a number`); }
    return val;
}
function boolean(val: boolean) {
    if (typeof val !== 'boolean') { throw new Error(`Value ${val} is not a boolean`); }
    return val;
}
function optional<T extends F<any>>(typ: T) {
    function optional(val: ReturnType<T>) {
        return typ(val);
    }
    optional[opSymbol] = true;
    return optional;
}

type Narrowable = string | number | boolean | symbol |
  object | {} | void | null | undefined;
const narrow = <T extends Narrowable>(arg: T) => arg;
const valAsLiteral = <T extends Narrowable>(typ: T) => (val: T) => {
    if (typ !== val) {
        throw new Error(`Value ${val} is not the same as ${typ}`);
    }
    return val;
};

const opSymbol = Symbol('optional');
// EXPORT
// All the type defs used for declarations
class Z {
    static undefined: F<undefined> = valAsLiteral(undefined);
    static null: F<null> = valAsLiteral(null);
    static string: F<string> = string;
    static number: F<number> = number;
    static boolean: F<boolean> = boolean;
    static literal = valAsLiteral;
    static optional = optional;
    static o = Z.optional;
    static array = <T extends F<any>>(typ: T) => (ary) => {
        if (!Array.isArray(ary)) {
            throw new Error(`${ary} is not an array`);
        }
        return ary.map(typ) as Array<ReturnType<T>>; // dumb that you have to explicitly type it
    }
    static object = <T extends O<any>>(typeobj: T) => <S extends RT<T>>(obj: S) => {
        Object.keys(typeobj).forEach((k) => {
            if (typeobj[k][opSymbol]) {
                return;
            }
            if (!(k in obj)) {
                throw new Error(`${obj} does not contain key ${k}`);
            }
        });
        return Object.entries(obj).reduce((a, [k, v]) => {
            if (!typeobj[k]) {
                throw new Error(`Object includes extra key ${k} not in type object ${typeobj}`);
            }
            return { ...a, [k]: typeobj[k](v) };
        }, {}) as RT<T>;  // dumb that you have to explicitly type it
    }
    static oneOf = <T extends Array<F<any>>>(...typs: T) => (val) => {
        const v = typs.reduce(<U extends F<any>>(a: AR<T>|undefined, typ: U) => {
            if (a) {
                return a;
            }
            let ret;
            try {
                ret = typ(val);
            } catch { }
            return ret as ReturnType<U>;
        }, undefined);
        if (!v) {
            throw new Error(`Value ${val} does not match any of ${typs.map((t) => t.name)}`);
        }
        return v as AR<T>; // dumb that you have to explicitly type it
    }
    static tuple = <T extends Array<F<any>> & { '0': F<any> }>(typ: T) => (array) => {
        // const array = tuplize(ary);
        if (typ.length !== array.length) {
            throw new Error(`Value ${array} is not a tuple of size ${typ.length}`);
        }
        return typ.map((t, i) => t(array[i])) as RR<T>; // dumb that you have to explicitly type it
    }
}
window.Z = Z;

// TZ describes the type of class Z
type TZ = typeof Z;
// type TZ = Omit<typeof Z, 'Z'>; // dumb that this still includes 'Z'

// KZ describes the keys of Z
type KZ = keyof TZ;

type static_test = keyof typeof Z;

// optional is a mess :(
// Finds return type of function, but not if its not a function
// type DefReturnType<T> = T extends (...k: any[]) => any ?  ReturnType<T> : never;

// type opCombinator<T extends F<any>> = (val?: any) => (R<T> | undefined);
// type opWrapper = <T extends F<any>>(typ: T) => opCombinator<T>;
// // Not exactly correct because the return types of 2 arity functions are fns
// type opZ = {[k in KZ]: opCombinator<F<DefReturnType<TZ[k]>>>} & opWrapper;
// function optional<T extends (F<any>|F<F<any>>)>(typ: T) {
//     // 2 arity type, lift typ
//     if (typeof typ() === 'function') {
//         return (typeVal) => {
//             function optional2(val?: any): R<T> | undefined { // dumb that you have write out the ret val
//                 return val && typ(typeVal)(val);
//             }
//             optional2[opSymbol] = true;
//             return optional2;
//         }
//     }

//     // 1 arity type
//     function optional1(val?: any): R<T>|undefined { // dumb that you have write out the ret val
//         return val && typ(val);
//     }
//     optional1[opSymbol] = true;
//     return optional;
// }
// Object.assign(
//     optional,
//     Object.entries(Z).reduce(
//         (a, [k, v]) => ({ ...a, [k]: optional(v) }),
//         {},
//     ) as TZ,
// );

// var optionalFn: opWrapper = <T extends F<any>>(typ: T) => {
//     const id: (val?: any) => (R<T>|undefined) = val => val && typ(val); // dumb that you have write out the ret val
//     id[opSymbol] = true;
//     return id;
// };
// // Assigns the dot operator to optional
// var optional: opZ = Object.assign(
//     optionalFn,
//     Object.entries(Z).reduce(
//         (a, [k, v]) => ({ ...a, [k]: optionalFn(v) }),
//         {},
//     ) as TZ,
// );

// =======================

// class $A extends G {
//     a = Z.string;
//     b = Z.number;
//     c = Z.array(Z.string);
//     d = Z.object({ a: Z.number });
//     e = Z.oneOf(Z.string, Z.number, Z.array(Z.string));
//     g = Z.tuple([Z.string, Z.number]);
//     h = Z.literal('f');
//     i = Z.object({
//         a: Z.tuple([Z.oneOf(Z.number, Z.literal('i')), Z.string])
//     });
//     j = Z.optional(Z.string);
//     k = Z.o.string;
//     l = Z.array(Z.o.string);
//     z = Z.number;
// }

// type A = RT<$A>; // make A a class too

type AR_test = AR<[typeof Z.string, typeof Z.number]>;

type Constructor<T> = new (...args) => T;

interface Base {
}

/*
    Cls - an class of type T
*/
function I<T extends G>(Cls: Constructor<T>) {
    const clsObj = Z.object(new Cls);
    class C {
        constructor(val: RT<T>) {
            const o = clsObj(val);
            Object.assign(this, o);
        }
    }
    return C as Constructor<RT<T>>;
}

class AI extends I(class _ extends G {
    a = Z.string;
    b = Z.oneOf(Z.number, Z.boolean);
    c = Z.literal('ff');
    d = Z.o(Z.literal('z'));
    e = Z.literal(true);
    f = Z.tuple([Z.number]);
}) { }
const ai2 = new AI({ a: 3, b: 3, c: 'ff', d: 'f', e: '' });
const ai1: AI = {
    a: '3',
    b: 4,
    c: 'ff',
    d: 4,
    e: true,
    f: ['f'],
};
console.log(ai2);
window.AI = AI;

const tuplize_test = tuplize([Z.string, Z.number]);

let narrow_test = narrow('c');

/*
Requirements
    1. Define structure once
        (or have strong typechecking between mulitple declarations)
        (or have one generate the other, in code)
    2. Nearly free deserialization.
    3. Can take output from JSON.parse.
    4. Runtime type checking.

Technical Notes
    * Classes give free structure and type.
    * Structure once means the means of deserialization needs
        incorporated in the declaration.

Limitations
    * TypeScript cannot create types from primatives, so no "literals"
        in type checking.
    * Due to converting a user created interface to generic then
        back again, extra keys will not be type checked.
*/
