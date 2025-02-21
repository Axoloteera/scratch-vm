const test = require('tap').test;

const ArgumentType = require('../../src/extension-support/argument-type');
const BlockType = require('../../src/extension-support/block-type');
const Runtime = require('../../src/engine/runtime');
const ScratchBlocksConstants = require('../../src/engine/scratch-blocks-constants');

/**
 * @type {ExtensionMetadata}
 */
const testExtensionInfo = {
    id: 'test',
    name: 'fake test extension',
    color1: '#111111',
    color2: '#222222',
    color3: '#333333',
    blocks: [
        {
            func: 'MAKE_A_VARIABLE',
            blockType: BlockType.BUTTON,
            text: 'this is a button'
        },
        {
            opcode: 'reporter',
            blockType: BlockType.REPORTER,
            text: 'simple text',
            blockIconURI: 'invalid icon URI' // trigger the 'scratch_extension' path
        },
        {
            opcode: 'inlineImage',
            blockType: BlockType.REPORTER,
            text: 'text and [IMAGE]',
            arguments: {
                IMAGE: {
                    type: ArgumentType.IMAGE,
                    dataURI: 'invalid image URI'
                }
            }
        },
        '---', // separator between groups of blocks in an extension
        {
            opcode: 'command',
            blockType: BlockType.COMMAND,
            text: 'text with [ARG] [ARG_WITH_DEFAULT]',
            arguments: {
                ARG: {
                    type: ArgumentType.STRING
                },
                ARG_WITH_DEFAULT: {
                    type: ArgumentType.STRING,
                    defaultValue: 'default text'
                }
            }
        },
        {
            opcode: 'ifElse',
            blockType: BlockType.CONDITIONAL,
            branchCount: 2,
            text: [
                'test if [THING] is spiffy and if so then',
                'or elsewise'
            ],
            arguments: {
                THING: {
                    type: ArgumentType.BOOLEAN
                }
            }
        },
        {
            opcode: 'loop',
            blockType: BlockType.LOOP, // implied branchCount of 1 unless otherwise stated
            isTerminal: true,
            text: [
                'loopty [MANY] loops'
            ],
            arguments: {
                MANY: {
                    type: ArgumentType.NUMBER
                }
            }
        }
    ]
};

const extensionInfoWithCustomFieldTypes = {
    id: 'test_custom_fieldType',
    name: 'fake test extension with customFieldTypes',
    color1: '#111111',
    color2: '#222222',
    color3: '#333333',
    blocks: [
        { // Block that uses custom field types
            opcode: 'motorTurnFor',
            blockType: BlockType.COMMAND,
            text: '[PORT] run [DIRECTION] for [VALUE] [UNIT]',
            arguments: {
                PORT: {
                    defaultValue: 'A',
                    type: 'single-port-selector'
                },
                DIRECTION: {
                    defaultValue: 'clockwise',
                    type: 'custom-direction'
                }
            }
        }
    ],
    customFieldTypes: {
        'single-port-selector': {
            output: 'string',
            outputShape: 2,
            implementation: {
                fromJson: () => null
            }
        },
        'custom-direction': {
            output: 'string',
            outputShape: 3,
            implementation: {
                fromJson: () => null
            }
        }
    }
};

const testCategoryInfo = function (t, block) {
    t.equal(block.json.category, 'fake test extension');
    t.equal(block.json.colour, '#111111');
    t.equal(block.json.colourSecondary, '#222222');
    t.equal(block.json.colourTertiary, '#333333');
    t.equal(block.json.inputsInline, true);
};

const testButton = function (t, button) {
    t.same(button.json, null); // should be null or undefined
    t.equal(button.xml, '<button text="this is a button" callbackKey="MAKE_A_VARIABLE"></button>');
};

const testReporter = function (t, reporter) {
    t.equal(reporter.json.type, 'test_reporter');
    testCategoryInfo(t, reporter);
    t.equal(reporter.json.checkboxInFlyout, true);
    t.equal(reporter.json.outputShape, ScratchBlocksConstants.OUTPUT_SHAPE_ROUND);
    t.equal(reporter.json.output, 'String');
    t.notOk(Object.prototype.hasOwnProperty.call(reporter.json, 'previousStatement'));
    t.notOk(Object.prototype.hasOwnProperty.call(reporter.json, 'nextStatement'));
    t.same(reporter.json.extensions, ['from_extension', 'scratch_extension']);
    t.equal(reporter.json.message0, '%1 %2simple text'); // "%1 %2" from the block icon
    t.notOk(Object.prototype.hasOwnProperty.call(reporter.json, 'message1'));
    t.same(reporter.json.args0, [
        // %1 in message0: the block icon
        {
            type: 'field_image',
            src: 'invalid icon URI',
            width: 40,
            height: 40
        },
        // %2 in message0: separator between icon and text (only added when there's also an icon)
        {
            type: 'field_vertical_separator'
        }
    ]);
    t.notOk(Object.prototype.hasOwnProperty.call(reporter.json, 'args1'));
    t.equal(reporter.xml, '<block type="test_reporter"></block>');
};

const testInlineImage = function (t, inlineImage) {
    t.equal(inlineImage.json.type, 'test_inlineImage');
    testCategoryInfo(t, inlineImage);
    t.equal(inlineImage.json.checkboxInFlyout, true);
    t.equal(inlineImage.json.outputShape, ScratchBlocksConstants.OUTPUT_SHAPE_ROUND);
    t.equal(inlineImage.json.output, 'String');
    t.notOk(Object.prototype.hasOwnProperty.call(inlineImage.json, 'previousStatement'));
    t.notOk(Object.prototype.hasOwnProperty.call(inlineImage.json, 'nextStatement'));
    t.same(inlineImage.json.extensions, ['from_extension']);
    t.equal(inlineImage.json.message0, 'text and %1'); // block text followed by inline image
    t.notOk(Object.prototype.hasOwnProperty.call(inlineImage.json, 'message1'));
    t.same(inlineImage.json.args0, [
        // %1 in message0: the block icon
        {
            type: 'field_image',
            src: 'invalid image URI',
            width: 24,
            height: 24,
            flip_rtl: false // False by default
        }
    ]);
    t.notOk(Object.prototype.hasOwnProperty.call(inlineImage.json, 'args1'));
    t.equal(inlineImage.xml, '<block type="test_inlineImage"></block>');
};

const testSeparator = function (t, separator) {
    t.same(separator.json, null); // should be null or undefined
    t.equal(separator.xml, '<sep gap="36"/>');
};

const testCommand = function (t, command) {
    t.equal(command.json.type, 'test_command');
    testCategoryInfo(t, command);
    t.equal(command.json.outputShape, ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE);
    t.assert(Object.prototype.hasOwnProperty.call(command.json, 'previousStatement'));
    t.assert(Object.prototype.hasOwnProperty.call(command.json, 'nextStatement'));
    t.same(command.json.extensions, ['from_extension']);
    t.equal(command.json.message0, 'text with %1 %2');
    t.notOk(Object.prototype.hasOwnProperty.call(command.json, 'message1'));
    t.strictSame(command.json.args0[0], {
        type: 'input_value',
        name: 'ARG'
    });
    t.notOk(Object.prototype.hasOwnProperty.call(command.json, 'args1'));
    t.equal(command.xml,
        '<block type="test_command"><value name="ARG"><shadow type="text"></shadow></value>' +
        '<value name="ARG_WITH_DEFAULT"><shadow type="text"><field name="TEXT">' +
        'default text</field></shadow></value></block>');
};

const testConditional = function (t, conditional) {
    t.equal(conditional.json.type, 'test_ifElse');
    testCategoryInfo(t, conditional);
    t.equal(conditional.json.outputShape, ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE);
    t.ok(Object.prototype.hasOwnProperty.call(conditional.json, 'previousStatement'));
    t.ok(Object.prototype.hasOwnProperty.call(conditional.json, 'nextStatement'));
    t.same(conditional.json.extensions, ['from_extension']);
    t.equal(conditional.json.message0, 'test if %1 is spiffy and if so then');
    t.equal(conditional.json.message1, '%1'); // placeholder for substack #1
    t.equal(conditional.json.message2, 'or elsewise');
    t.equal(conditional.json.message3, '%1'); // placeholder for substack #2
    t.notOk(Object.prototype.hasOwnProperty.call(conditional.json, 'message4'));
    t.strictSame(conditional.json.args0[0], {
        type: 'input_value',
        name: 'THING',
        check: 'Boolean'
    });
    t.strictSame(conditional.json.args1[0], {
        type: 'input_statement',
        name: 'SUBSTACK'
    });
    t.notOk(Object.prototype.hasOwnProperty.call(conditional.json, conditional.json.args2));
    t.strictSame(conditional.json.args3[0], {
        type: 'input_statement',
        name: 'SUBSTACK2'
    });
    t.notOk(Object.prototype.hasOwnProperty.call(conditional.json, 'args4'));
    t.equal(conditional.xml, '<block type="test_ifElse"><value name="THING"></value></block>');
};

const testLoop = function (t, loop) {
    t.equal(loop.json.type, 'test_loop');
    testCategoryInfo(t, loop);
    t.equal(loop.json.outputShape, ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE);
    t.ok(Object.prototype.hasOwnProperty.call(loop.json, 'previousStatement'));
    t.notOk(Object.prototype.hasOwnProperty.call(loop.json, 'nextStatement')); // isTerminal is set on this block
    t.same(loop.json.extensions, ['from_extension']);
    t.equal(loop.json.message0, 'loopty %1 loops');
    t.equal(loop.json.message1, '%1'); // placeholder for substack
    t.equal(loop.json.message2, '%1'); // placeholder for loop arrow
    t.notOk(Object.prototype.hasOwnProperty.call(loop.json, 'message3'));
    t.strictSame(loop.json.args0[0], {
        type: 'input_value',
        name: 'MANY'
    });
    t.strictSame(loop.json.args1[0], {
        type: 'input_statement',
        name: 'SUBSTACK'
    });
    t.equal(loop.json.lastDummyAlign2, 'RIGHT'); // move loop arrow to right side
    t.equal(loop.json.args2[0].type, 'field_image');
    t.equal(loop.json.args2[0].flip_rtl, true);
    t.notOk(Object.prototype.hasOwnProperty.call(loop.json, 'args3'));
    t.equal(loop.xml,
        '<block type="test_loop"><value name="MANY"><shadow type="math_number"></shadow></value></block>');
};

test('registerExtensionPrimitives', t => {
    const runtime = new Runtime();

    runtime.on(Runtime.EXTENSION_ADDED, categoryInfo => {
        const blocksInfo = categoryInfo.blocks;
        t.equal(blocksInfo.length, testExtensionInfo.blocks.length);

        blocksInfo.forEach(blockInfo => {
            // `true` here means "either an object or a non-empty string but definitely not null or undefined"
            t.true(blockInfo.info, 'Every block and pseudo-block must have a non-empty "info" field');
        });

        // Note that this also implicitly tests that block order is preserved
        const [button, reporter, inlineImage, separator, command, conditional, loop] = blocksInfo;

        testButton(t, button);
        testReporter(t, reporter);
        testInlineImage(t, inlineImage);
        testSeparator(t, separator);
        testCommand(t, command);
        testConditional(t, conditional);
        testLoop(t, loop);

        t.end();
    });

    runtime._registerExtensionPrimitives(testExtensionInfo);
});

test('custom field types should be added to block and EXTENSION_FIELD_ADDED callback triggered', t => {
    const runtime = new Runtime();

    runtime.on(Runtime.EXTENSION_ADDED, categoryInfo => {
        const blockInfo = categoryInfo.blocks[0];

        // We expect that for each argument there's a corresponding <field>-tag in the block XML
        Object.values(blockInfo.info.arguments).forEach(argument => {
            const regex = new RegExp(`<field name="field_${categoryInfo.id}_${argument.type}">`);
            t.true(regex.test(blockInfo.xml));
        });

    });

    let fieldAddedCallbacks = 0;
    runtime.on(Runtime.EXTENSION_FIELD_ADDED, () => {
        fieldAddedCallbacks++;
    });

    runtime._registerExtensionPrimitives(extensionInfoWithCustomFieldTypes);

    // Extension includes two custom field types
    t.equal(fieldAddedCallbacks, 2);
    t.end();
});
