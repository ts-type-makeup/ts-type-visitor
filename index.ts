import {
  TypeChecker,
  Type,
  TypeFlags,
  SymbolFlags,
  BigIntLiteralType,
  PseudoBigInt,
  ObjectType,
  ObjectFlags,
  TypeReference,
} from "typescript";

export type TypeModel =
  | TypeModelString
  | TypeModelBoolean
  | TypeModelNumber
  | TypeModelObject
  | TypeModelObjectWithIndex
  | TypeModelUnidentified
  | TypeModelAny
  | TypeModelUnknown
  | TypeModelEnum
  | TypeModelBigInt
  | TypeModelStringLiteral
  | TypeModelNumberLiteral
  | TypeModelBooleanLiteral
  | TypeModelEnumLiteral
  | TypeModelBigIntLiteral
  | TypeModelESSymbol
  | TypeModelUniqueESSymbol
  | TypeModelVoid
  | TypeModelUndefined
  | TypeModelNull
  | TypeModelNever
  | TypeModelTypeParameter
  | TypeModelUnion
  | TypeModelIntersection
  | TypeModelIndex
  | TypeModelIndexedAccess
  | TypeModelConditional
  | TypeModelSubstitution
  | TypeModelNonPrimitive
  | TypeModelArray
  | TypeModelTuple;

type MapWithIntersect<TOrig, TAdd> = TOrig extends any ? TOrig & TAdd : never;

export type TypeModelWithPropFields = MapWithIntersect<TypeModel, PropFields>;

export interface PropFields {
  readonly name: string;
  readonly optional: boolean;
}

export interface TypeModelBase {
  readonly originalType?: Type;
  readonly toJSON: () => any;
}

export interface TypeModelAny extends TypeModelBase {
  readonly kind: "any";
}

export interface TypeModelUnknown extends TypeModelBase {
  readonly kind: "unknown";
}

export interface TypeModelString extends TypeModelBase {
  readonly kind: "string";
}

export interface TypeModelNumber extends TypeModelBase {
  readonly kind: "number";
}

export interface TypeModelBoolean extends TypeModelBase {
  readonly kind: "boolean";
}

export interface TypeModelEnum extends TypeModelBase {
  readonly kind: "enum";
  readonly values: TypeModel[];
}

export interface TypeModelBigInt extends TypeModelBase {
  readonly kind: "bigint";
}

export interface TypeModelStringLiteral extends TypeModelBase {
  readonly kind: "stringLiteral";
  readonly value: string;
}

export interface TypeModelNumberLiteral extends TypeModelBase {
  readonly kind: "numberLiteral";
  readonly value: number;
}

export interface TypeModelBooleanLiteral extends TypeModelBase {
  readonly kind: "booleanLiteral";
  readonly value: boolean;
}

export interface TypeModelEnumLiteral extends TypeModelBase {
  readonly kind: "enumLiteral";
  readonly values: TypeModel[];
}

export interface TypeModelBigIntLiteral extends TypeModelBase {
  readonly kind: "bigintLiteral";
  readonly value: PseudoBigInt;
}

export interface TypeModelESSymbol extends TypeModelBase {
  readonly kind: "esSymbol";
}

export interface TypeModelUniqueESSymbol extends TypeModelBase {
  readonly kind: "uniqueEsSymbol";
}

export interface TypeModelVoid extends TypeModelBase {
  readonly kind: "void";
}

export interface TypeModelUndefined extends TypeModelBase {
  readonly kind: "undefined";
}

export interface TypeModelNull extends TypeModelBase {
  readonly kind: "null";
}

export interface TypeModelNever extends TypeModelBase {
  readonly kind: "never";
}

export interface TypeModelTypeParameter extends TypeModelBase {
  readonly kind: "typeParameter";
}

export interface TypeModelUnion<T extends TypeModel = TypeModel>
  extends TypeModelBase {
  readonly kind: "union";
  readonly types: T[];
}

export interface TypeModelIntersection extends TypeModelBase {
  readonly kind: "intersection";
  readonly types: TypeModel[];
}

export interface TypeModelIndex extends TypeModelBase {
  readonly kind: "index";
  readonly keyType:
    | TypeModelUnion<TypeModelString | TypeModelNumber>
    | TypeModelString
    | TypeModelNumber;
  readonly valueType: TypeModel;
}

export interface TypeModelIndexedAccess extends TypeModelBase {
  readonly kind: "indexedAccess";
}

export interface TypeModelConditional extends TypeModelBase {
  readonly kind: "conditional";
}

export interface TypeModelSubstitution extends TypeModelBase {
  readonly kind: "substitution";
}

export interface TypeModelNonPrimitive extends TypeModelBase {
  readonly kind: "nonPrimitive";
}

export interface TypeModelUnidentified extends TypeModelBase {
  readonly kind: "unidentified";
}

export interface TypeModelObject extends TypeModelBase {
  readonly kind: "object";
  readonly props: Array<TypeModelWithPropFields>;
}

export interface TypeModelObjectWithIndex extends TypeModelBase {
  readonly kind: "objectWithIndex";
  readonly props: Array<TypeModelWithPropFields>;
  readonly index: TypeModelIndex;
}

export interface TypeModelArray extends TypeModelBase {
  readonly kind: "array";
  readonly type: TypeModel;
}

export interface TypeModelTuple extends TypeModelBase {
  readonly kind: "tuple";
  readonly types: TypeModel[];
}

export type TypeModelKinds = TypeModel["kind"];

function isBigIntLiteral(type: Type): type is BigIntLiteralType {
  return !!(type.flags & TypeFlags.BigIntLiteral);
}

function isObjectType(type: Type): type is ObjectType {
  return !!(type.flags & TypeFlags.Object);
}

function isReferenceType(type: ObjectType): type is TypeReference {
  return !!(type.objectFlags & ObjectFlags.Reference);
}

function toJSON(this: TypeModelBase) {
  const { originalType, ...rest } = this;
  return rest;
}

export const typeVisitor = (checker: TypeChecker, type: Type): TypeModel => {
  // We're not handling things SomethingLike cause there're unions of flags
  // and would be handled anyway into more specific types
  // VoidLike is Undefined or Void,
  // StringLike is String or StringLiteral
  // NumberLike is Number or NumberLiteral or Enum
  // BigIntLike is BigInt or BigIntLiteral
  // ESSymbolLike is ESSymbol or ESUniqueSymbol
  // Don't take those ^ definitions too seriously, they're subject to change

  if (type.flags & TypeFlags.Any) {
    return {
      kind: "any",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.Unknown) {
    return {
      kind: "unknown",
      originalType: type,
      toJSON,
    };
  }

  if (type.isStringLiteral()) {
    return {
      kind: "stringLiteral",
      value: type.value,
      originalType: type,
      toJSON,
    };
  }

  if (type.isNumberLiteral()) {
    return {
      kind: "numberLiteral",
      value: type.value,
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.BooleanLiteral) {
    return {
      kind: "booleanLiteral",
      // FIXME It's a dirty hack but i can't seem to find any other way to get a value of BooleanLiteral
      value: (type as any).intrinsicName === "true",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.EnumLiteral && type.isUnion()) {
    return {
      kind: "enumLiteral",
      values: type.types.map((t) => typeVisitor(checker, t)),
      originalType: type,
      toJSON,
    };
  }

  if (isBigIntLiteral(type)) {
    return {
      kind: "bigintLiteral",
      value: type.value,
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.String) {
    return {
      kind: "string",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.Boolean) {
    return {
      kind: "boolean",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.Number) {
    return {
      kind: "number",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.Enum && type.isUnion()) {
    return {
      kind: "enum",
      values: type.types.map((t) => typeVisitor(checker, t)),
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.BigInt) {
    return {
      kind: "bigint",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.ESSymbol) {
    return {
      kind: "esSymbol",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.UniqueESSymbol) {
    return {
      kind: "uniqueEsSymbol",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.Void) {
    return {
      kind: "void",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.Undefined) {
    return {
      kind: "undefined",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.Null) {
    return {
      kind: "null",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.Never) {
    return {
      kind: "never",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.TypeParameter) {
    return {
      kind: "typeParameter",
      originalType: type,
      toJSON,
    };
  }

  // Tuple special handling
  if (
    isObjectType(type) &&
    isReferenceType(type) &&
    type.target.objectFlags & ObjectFlags.Tuple &&
    !!type.typeArguments &&
    type.typeArguments.length > 0
  ) {
    return {
      kind: "tuple",
      types: type.typeArguments.map((t) => typeVisitor(checker, t)),
      originalType: type,
      toJSON,
    };
  }

  // Array special handling
  if (
    isObjectType(type) &&
    isReferenceType(type) &&
    !!type.typeArguments &&
    type.typeArguments.length > 0
  ) {
    const symbol = type.getSymbol();
    if (!!symbol && symbol.getName() === "Array") {
      return {
        kind: "array",
        type: typeVisitor(checker, type.typeArguments[0]),
        originalType: type,
        toJSON,
      };
    }
  }

  if (type.flags & TypeFlags.Object) {
    const props = type.getProperties();
    const propsDescriptor = props.map((prop) => ({
      name: prop.name,
      optional: !!(prop.flags & SymbolFlags.Optional),
      ...typeVisitor(
        checker,
        checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration),
      ),
    }));

    // index types
    const stringIndexType = type.getStringIndexType();
    const numberIndexType = type.getNumberIndexType();

    if (!!stringIndexType && !!numberIndexType) {
      return {
        kind: "objectWithIndex",
        props: propsDescriptor,
        index: {
          kind: "index",
          keyType: {
            kind: "union",
            types: [
              { kind: "string", toJSON },
              { kind: "number", toJSON },
            ],
            toJSON,
          },
          valueType: typeVisitor(checker, stringIndexType),
          toJSON,
        },
        originalType: type,
        toJSON,
      };
    }

    if (!!numberIndexType) {
      return {
        kind: "objectWithIndex",
        props: propsDescriptor,
        index: {
          kind: "index",
          keyType: { kind: "number", toJSON },
          valueType: typeVisitor(checker, numberIndexType),
          toJSON,
        },
        originalType: type,
        toJSON,
      };
    }

    if (!!stringIndexType) {
      return {
        kind: "objectWithIndex",
        props: propsDescriptor,
        index: {
          kind: "index",
          keyType: { kind: "string", toJSON },
          valueType: typeVisitor(checker, stringIndexType),
          toJSON,
        },
        originalType: type,
        toJSON,
      };
    }

    return {
      kind: "object",
      props: propsDescriptor,
      originalType: type,
      toJSON,
    };
  }

  if (type.isUnion()) {
    return {
      kind: "union",
      types: type.types.map((t) => typeVisitor(checker, t)),
      originalType: type,
      toJSON,
    };
  }

  if (type.isIntersection()) {
    return {
      kind: "intersection",
      types: type.types.map((t) => typeVisitor(checker, t)),
      originalType: type,
      toJSON,
    };
  }

  // TODO Find out where i can meet TypeFlags.Index
  // if (type.flags & TypeFlags.Index) {
  //   return {
  //     kind: "index"
  //   };
  // }

  if (type.flags & TypeFlags.IndexedAccess) {
    return {
      kind: "indexedAccess",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.Conditional) {
    return {
      kind: "conditional",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.Substitution) {
    return {
      kind: "substitution",
      originalType: type,
      toJSON,
    };
  }

  if (type.flags & TypeFlags.NonPrimitive) {
    return {
      kind: "nonPrimitive",
      originalType: type,
      toJSON,
    };
  }

  return {
    kind: "unidentified",
    originalType: type,
    toJSON,
  };
};
