# Hallpass

A small restroom-pass prototype with student and teacher views.

## Try it

Open `index.html` in a modern browser. In Student view, choose a student and request a pass. Switch to Teacher view to approve or deny it. After approval, switch back to that student and check in when they return.

Pass activity is saved in the current browser with `localStorage`. This makes the prototype useful for trying the workflow on one device, but it does not synchronize between a student's and teacher's separate devices. Real classroom use would need a shared backend and authenticated student and teacher accounts.
