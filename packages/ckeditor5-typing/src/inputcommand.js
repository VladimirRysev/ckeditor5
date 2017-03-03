/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module typing/inputcommand
 */

import Command from '@ckeditor/ckeditor5-core/src/command/command';
import ChangeBuffer from './changebuffer';

/**
 * The input command. Used by the {@link module:typing/input~Input input feature} to handle typing.
 *
 * @extends module:core/command/command~Command
 */
export default class InputCommand extends Command {
	/**
	 * Creates an instance of the command.
	 *
	 * @param {module:core/editor/editor~Editor} editor
	 * @param {Number} undoStepSize The maximum number of atomic changes
	 * which can be contained in one batch in the command buffer.
	 */
	constructor( editor, undoStepSize ) {
		super( editor );

		/**
		 * Typing's change buffer used to group subsequent changes into batches.
		 *
		 * @readonly
		 * @private
		 * @member {module:typing/changebuffer~ChangeBuffer} #_buffer
		 */
		this._buffer = new ChangeBuffer( editor.document, undoStepSize );
	}

	/**
	 * @inheritDoc
	 */
	destroy() {
		super.destroy();

		this._buffer.destroy();
		this._buffer = null;
	}

	/**
	 * The current change buffer.
	 *
	 * @type {module:typing/changebuffer~ChangeBuffer}
	 */
	get buffer() {
		return this._buffer;
	}

	/**
	 * Executes the input command. It replaces the content within the given range with the given text.
	 * Replacing is a two step process, first content within the range is removed and then new text is inserted
	 * on the beginning of the range (which after removal is a collapsed range).
	 *
	 * @param {Object} [options] The command options.
	 * @param {String} [options.text=''] Text to be inserted.
	 * @param {module:engine/model/range~Range} [options.range] Range in which the text is inserted. Defaults
	 * to the first range in the current selection.
	 * @param {module:engine/model/position~Position} [options.resultPosition] Position at which the selection
	 * should be placed after the insertion. If not specified, the selection will be placed right after
	 * the inserted text.
	 */
	_doExecute( options = {} ) {
		const doc = this.editor.document;
		const text = options.text || '';
		const textInsertions = text.length;
		const range = options.range || doc.selection.getFirstRange();
		const resultPosition = options.resultPosition;

		doc.enqueueChanges( () => {
			const isCollapsedRange = range.isCollapsed;

			if ( !isCollapsedRange ) {
				this._buffer.batch.remove( range );
			}

			this._buffer.batch.weakInsert( range.start, text );

			if ( resultPosition ) {
				this.editor.data.model.selection.collapse( resultPosition );
			} else if ( isCollapsedRange ) {
				// If range was collapsed just shift the selection by the number of inserted characters.
				this.editor.data.model.selection.collapse( range.start.getShiftedBy( textInsertions ) );
			}

			this._buffer.input( textInsertions );
		} );
	}
}
