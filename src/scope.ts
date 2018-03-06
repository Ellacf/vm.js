import {ErrDuplicateDeclard} from "./error";
import Context from "./context";

export type ScopeType = "function" | "loop" | "switch" | "block";

export type Kind = "const" | "var" | "let";

export class ScopeVar {
  constructor(public kind: Kind, public value: any, public scope: Scope) {
    this.value = value;
    this.kind = kind;
  }

  $set(value: any): boolean {
    this.value = value;
    return true;
  }

  $get(): any {
    return this.value;
  }
}

export class Scope {
  private content: {[key: string]: ScopeVar} = {};

  public invasived: boolean = false;

  public isTopLevel: boolean = false;

  public context: Context = {};

  constructor(
    public readonly type: ScopeType,
    private parent: Scope | null = null,
    label?: string
  ) {}

  $setContext(context: Context) {
    this.context = context;
    for (let name in context) {
      if (context.hasOwnProperty(name)) {
        // here should use $var
        this.$var(name, context[name]);
      }
    }
  }

  $all() {
    const map = {};
    for (let varName in this.content) {
      const val = this.content[varName];
      map[varName] = val instanceof ScopeVar ? val.$get() : undefined;
    }
    return map;
  }

  $find(varName: string): ScopeVar | null {
    if (this.content.hasOwnProperty(varName)) {
      return this.content[varName];
    } else if (this.parent) {
      return this.parent.$find(varName);
    } else {
      return null;
    }
  }

  $let(varName: string, value: any): boolean {
    const $var = this.content[varName];
    if (!$var) {
      this.content[varName] = new ScopeVar("let", value, this);
      return true;
    } else {
      throw new ErrDuplicateDeclard(varName);
    }
  }

  $const(varName: string, value: any): boolean {
    const $var = this.content[varName];
    if (!$var) {
      this.content[varName] = new ScopeVar("const", value, this);
      return true;
    } else {
      throw new ErrDuplicateDeclard(varName);
    }
  }

  $var(varName: string, value: any): boolean {
    let scope: Scope = this;

    while (scope.parent !== null && scope.type !== "function") {
      scope = scope.parent;
    }

    const $var = scope.content[varName];
    if ($var) {
      if ($var.kind !== "var") {
        // only cover var with var, not const and let
        throw new ErrDuplicateDeclard(varName);
      } else {
        if (this.isTopLevel && this.context[varName]) {
          // top level context can not be cover
        } else {
          this.content[varName] = new ScopeVar("var", value, this);
        }
      }
    } else {
      this.content[varName] = new ScopeVar("var", value, this);
    }
    return true;
  }

  $declar(kind: Kind, raw_name: string, value: any): boolean {
    return {
      var: () => this.$var(raw_name, value),
      let: () => this.$let(raw_name, value),
      const: () => this.$const(raw_name, value)
    }[kind]();
  }
  $child(type: ScopeType, label?: string) {
    return new Scope(type, this, label);
  }
}
