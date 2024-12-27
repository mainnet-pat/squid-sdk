"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFtsMigrations = generateFtsMigrations;
const util_naming_1 = require("@subsquid/util-naming");
const TS = 64060578000000;
function generateFtsMigrations(model, dir) {
    for (const name in model) {
        const item = model[name];
        if (item.kind === 'fts') {
            generateMigration(name, item, dir);
        }
    }
}
function generateMigration(name, query, dir) {
    const out = dir.file(`${name}.search.js`);
    out.block(`module.exports = class ${name}${TS}`, () => {
        out.line(`name = '${name}${TS}'`);
        const sources = query.sources.map((src) => {
            const table = (0, util_naming_1.toSnakeCase)(src.entity);
            const ginIndex = `${(0, util_naming_1.toSnakeCase)(name)}_${(0, util_naming_1.toSnakeCase)(src.entity)}_idx`;
            const tsvColumn = `${(0, util_naming_1.toSnakeCase)(name)}_tsv`;
            const tsvectorValue = src.fields
                .map((f) => {
                return `setweight(to_tsvector('english', coalesce(${(0, util_naming_1.toSnakeCase)(f)}, '')), 'A')`;
            })
                .join(' || ');
            return { table, ginIndex, tsvColumn, tsvectorValue };
        });
        out.line();
        out.block('async up(queryRunner)', () => {
            sources.forEach((src) => {
                out.line(`await queryRunner.query(\`ALTER TABLE "${src.table}" ADD COLUMN "${src.tsvColumn}" tsvector GENERATED ALWAYS AS (${src.tsvectorValue}) STORED\`)`);
                out.line(`await queryRunner.query(\`CREATE INDEX "${src.ginIndex}" ON "${src.table}" USING GIN ("${src.tsvColumn}")\`)`);
            });
        });
        out.line();
        out.block('async down(queryRunner)', () => {
            sources.forEach((src) => {
                out.line(`await queryRunner.query('DROP INDEX "${src.ginIndex}"')`);
                out.line(`await queryRunner.query('ALTER TABLE "${src.table}" DROP "${src.tsvColumn}"')`);
            });
        });
    });
    out.write();
}
//# sourceMappingURL=fts.js.map