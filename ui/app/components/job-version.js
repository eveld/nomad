import Component from '@ember/component';
import { action, computed } from '@ember/object';
import { classNames } from '@ember-decorators/component';
import { task } from 'ember-concurrency';
import messageForError from 'nomad-ui/utils/message-from-adapter-error';
import classic from 'ember-classic-decorator';

const changeTypes = ['Added', 'Deleted', 'Edited'];

@classic
@classNames('job-version', 'boxed-section')
export default class JobVersion extends Component {
  version = null;
  isOpen = false;

  // Passes through to the job-diff component
  verbose = true;

  @computed('version.diff')
  get changeCount() {
    const diff = this.get('version.diff');
    const taskGroups = diff.TaskGroups || [];

    if (!diff) {
      return 0;
    }

    return (
      fieldChanges(diff) +
      taskGroups.reduce(arrayOfFieldChanges, 0) +
      (taskGroups.mapBy('Tasks') || []).reduce(flatten, []).reduce(arrayOfFieldChanges, 0)
    );
  }

  @computed('version.{number,job.version}')
  get isCurrent() {
    return this.get('version.number') === this.get('version.job.version');
  }

  @action
  toggleDiff() {
    this.toggleProperty('isOpen');
  }

  @task(function*() {
    try {
      yield this.version.revertTo();
      yield this.version.job.reload();
    } catch (e) {
      this.handleError({
        title: 'Could Not Revert',
        description: messageForError(e, 'revert'),
      });
    }
  })
  revertTo;
}

const flatten = (accumulator, array) => accumulator.concat(array);
const countChanges = (total, field) => (changeTypes.includes(field.Type) ? total + 1 : total);

function fieldChanges(diff) {
  return (
    (diff.Fields || []).reduce(countChanges, 0) +
    (diff.Objects || []).reduce(arrayOfFieldChanges, 0)
  );
}

function arrayOfFieldChanges(count, diff) {
  if (!diff) {
    return count;
  }

  return count + fieldChanges(diff);
}
