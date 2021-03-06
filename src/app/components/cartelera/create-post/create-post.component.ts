import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/storage';
import { Observable } from 'rxjs/Observable';
import { finalize } from 'rxjs/operators';
import { CarteleraService } from '../../../services/cartelera.service';
import { UserService } from '../../../services/user.service';
import { ToasterService } from '../../../services/toaster.service';
import { LocalStorageService } from '../../../services/local-storage.service';
import { Cartelera } from '../../../models/cartelera';
import { Post } from '../../../models/post';
import { Notificacion } from '../../../models/notificacion';
import { Usuario } from '../../../models/usuario';

@Component({
    selector: 'info-create-post',
    templateUrl: './create-post.component.html',
    styleUrls: ['./create-post.component.scss']
})
export class CreatePostComponent implements OnInit {

    idCartelera: string;
    cartelera: Cartelera;
    seguidores: Usuario[];
    permissionForCartelera: boolean[] = new Array();
    createPostForm: FormGroup;
    imageUrl: string;
    comentariosHabilitados = false;
    submitted = false;
    loading = false;
    loaded = false;
    loadFinished = false;
    uploadProgress: Observable<number>;
    uploadUrl: Observable<string>;

    constructor(private carteleraService: CarteleraService,
                private userService: UserService,
                private toasterService: ToasterService,
                private router: Router,
                private route: ActivatedRoute,
                private formBuilder: FormBuilder,
                private fireStorage: AngularFireStorage,
                public localStorageService: LocalStorageService) { }

    ngOnInit() {
        this.idCartelera = this.route.snapshot.paramMap.get('idCartelera');
        this.carteleraService.getCartelera(this.idCartelera)
            .subscribe(
                (cartelera: Cartelera) => {
                    this.cartelera = cartelera;
                    if (this.userService.hasAuthority('PROFESOR', this.localStorageService.getAuthorities())) {
                        this.requestCartelerasWithPermissions(this.localStorageService.getUserId());
                        setTimeout(() => {
                            if (this.hasPermissions()) {
                                this.loadFinished = true;
                            }
                            else {
                                this.router.navigateByUrl('home');
                                this.toasterService.warning('No tienes permisos para realizar esta acción !');
                            }
                        }, 1000);
                    }
                    else {
                        this.loadFinished = true;
                    }
                },
                (error) => {
                    if (error.status == 404) {
                        console.log(error.message);
                        this.router.navigateByUrl('/page-not-found');
                    }
                }
            );
        this.createPostForm = this.formBuilder.group({
            title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
            description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
            image: [''],
            comments_enabled: [false]
        });
    }

    get form() {
        return this.createPostForm.controls;
    }

    requestCartelerasWithPermissions(idProfesor: string) {
		this.userService.getPermissions(idProfesor)
			.subscribe(
				(permissions) => {
					for (let permission of permissions) {
						this.userService.getBillboardForPermission(permission.id)
							.subscribe(
								(cartelera: Cartelera) => {
                                    if (cartelera.id == this.cartelera.id)
                                        this.permissionForCartelera[cartelera.id] = true;
                                    else
                                        this.permissionForCartelera[cartelera.id] = true;
								}
							);
					}
				}
			);
    }

    hasPermissions() {
        return this.permissionForCartelera[this.cartelera.id];
    }

    createPost() {
        this.submitted = true;
        if (this.createPostForm.valid) {
            let formData = this.createPostForm.value;
            formData.user = `users/${this.localStorageService.getUserId()}`;
            formData.billboard = `billboards/${this.idCartelera}`;
            if (this.imageUrl == undefined)
                formData.image = '../../../../assets/publicacion.jpg';
            else
                formData.image = this.imageUrl;
            this.carteleraService.postPublicacion(formData)
                .subscribe(
                    (newPost: Post) => {
                        this.getSeguidoresForCartelera(this.idCartelera);
                        this.notificarUsuarios(newPost);
                        this.router.navigateByUrl(`/cartelera/${this.idCartelera}`);
                        this.toasterService.success('Publicación creada con éxito !');
                        console.log(newPost);
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

    getSeguidoresForCartelera(idCartelera: string) {
        this.carteleraService.getSeguidores(idCartelera)
            .subscribe(
                (seguidores: Usuario[]) => this.seguidores = seguidores
            )
    }

    notificarUsuarios(newPost: Post) {
        this.carteleraService.postNotification(`Se creó la publicación "${newPost.title}" en la cartelera "${this.cartelera.title}"`, newPost.id, this.localStorageService.getUserId())
            .subscribe(
                (notificacion: Notificacion) => {
                    for (let seguidor of this.seguidores) {
                        this.carteleraService.postUserNotification(notificacion.id, seguidor.id).subscribe();
                    }
                }
            );
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
