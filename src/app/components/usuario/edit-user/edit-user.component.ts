import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/storage';
import { Observable } from 'rxjs/Observable';
import { finalize } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { ToasterService } from '../../../services/toaster.service';
import { LocalStorageService } from '../../../services/local-storage.service';
import { Usuario } from '../../../models/usuario';

@Component({
	selector: 'info-edit-user',
	templateUrl: './edit-user.component.html',
	styleUrls: ['./edit-user.component.scss']
})
export class EditUserComponent implements OnInit {

	user: Usuario;
	editUserForm: FormGroup;
	imageUrl: string;
	submitted = false;
	loading = false;
    loaded = false;
	uploadProgress: Observable<number>;
    uploadUrl: Observable<string>;

	constructor(private userService: UserService,
				private toasterService: ToasterService,
				private localStorageService: LocalStorageService,
				private formBuilder: FormBuilder,
				private fireStorage: AngularFireStorage,
				private router: Router,
				private route: ActivatedRoute) { }

	ngOnInit() {
		let idUser: string;
		idUser = this.route.snapshot.paramMap.get('idUser');
		if (this.localStorageService.getUserId() != idUser) {
			this.router.navigateByUrl('/page-not-found');
		}
		this.userService.getUserById(idUser)
			.subscribe(
				(user: Usuario) => this.user = user
			);
		this.editUserForm = this.formBuilder.group({
			name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
			lastname: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
			email: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
			photo: ['']
		});
	}

	get form() {
        return this.editUserForm.controls;
    }

	editUser() {
		this.submitted = true;
        if (this.editUserForm.valid) {
			let formData = this.editUserForm.value;
			formData.id = this.user.id;
			if (this.imageUrl == undefined)
				// Si no se cambio la imagen, se mantiene la misma
				formData.photo = this.user.photo;
			else
				formData.photo = this.imageUrl;
			formData.active = true;
            this.userService.updateUser(formData)
                .subscribe(
                    (updatedUser: Usuario) => {
                        this.router.navigateByUrl(`/user/${this.user.id}`);
                        this.toasterService.success('Usuario editado con éxito !');
                        console.log(updatedUser);
                    },
                    (error) => {
                        this.toasterService.error('Ha ocurrido un error', 'La acción no ha podido realizarse');
                        console.error(error.message);
                    }
                );
        }
        else {
            return;
        }
    }

	upload(event) {

		this.loading = true;

        const file = event.target.files[0];

        const randomId = Math.random().toString(36).substring(2);

        const filepath = `images/${randomId}`;

        const fileRef = this.fireStorage.ref(filepath);

        const task = this.fireStorage.upload(filepath, file);

        this.uploadProgress = task.percentageChanges();

        task.snapshotChanges().pipe(
            finalize(() => {
                this.uploadUrl = fileRef.getDownloadURL();
				this.uploadUrl.subscribe((imageUrl) => this.imageUrl = imageUrl);
				this.loading = false;
                this.loaded = true;
            })
        ).subscribe();
    }

}
